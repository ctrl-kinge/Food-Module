import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { OrderStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NEXT_STATUS, canCancel, ALL_STATUSES, STATUS_LABELS } from "@/lib/order-status";
import { createNotification } from "@/lib/notify";
import { notificationContent } from "@/lib/notify-format";
import { selectNearestRider } from "@/lib/dispatch";

const StatusSchema = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
  prepMinutes: z.number().int().positive().max(240).optional(),
  reason: z.string().trim().max(280).optional(),
});

// Transitions owned by the restaurant vs the rider (by the *current* status).
const RESTAURANT_STAGES: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING"];
const RIDER_STAGES: OrderStatus[] = [
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "EN_ROUTE",
];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = StatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const target = parsed.data.status as OrderStatus;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const role = session.user.role;
  const isForward = NEXT_STATUS[order.status] === target;
  const isCancel = target === "CANCELLED" && canCancel(order.status);

  if (isCancel) {
    if (role !== "RESTAURANT") {
      return NextResponse.json(
        { error: "Only restaurants can cancel orders" },
        { status: 403 },
      );
    }
  } else if (isForward) {
    if (RESTAURANT_STAGES.includes(order.status)) {
      if (role !== "RESTAURANT") {
        return NextResponse.json(
          { error: "Only the restaurant can advance this order" },
          { status: 403 },
        );
      }
    } else if (RIDER_STAGES.includes(order.status)) {
      if (role !== "RIDER" || order.riderId !== session.user.id) {
        return NextResponse.json(
          { error: "Only the assigned rider can advance this order" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Order is already complete" },
        { status: 409 },
      );
    }
  } else {
    return NextResponse.json(
      { error: `Cannot move from ${order.status} to ${target}` },
      { status: 409 },
    );
  }

  const data: {
    status: OrderStatus;
    prepMinutes?: number;
    cancelReason?: string;
  } = { status: target };
  if (target === "ACCEPTED" && parsed.data.prepMinutes != null) {
    data.prepMinutes = parsed.data.prepMinutes;
  }
  if (target === "CANCELLED" && parsed.data.reason) {
    data.cancelReason = parsed.data.reason;
  }
  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
  });

  {
    const c = notificationContent("ORDER_STATUS", {
      orderShortId: order.id.slice(-6),
      statusLabel: STATUS_LABELS[target],
    });
    await createNotification({
      userId: order.customerId,
      type: "ORDER_STATUS",
      title: c.title,
      body: c.body,
      orderId: order.id,
      url: `/orders/${order.id}`,
    });
  }

  // When an order becomes ready and has no rider, auto-assign the nearest
  // online rider. Best-effort: if none are online it stays open for manual
  // claim (the existing /assign flow), and any failure here doesn't block the
  // status change that already succeeded.
  if (target === "READY_FOR_PICKUP" && !order.riderId) {
    try {
      const [restaurant, riders] = await Promise.all([
        prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
          select: { lat: true, lng: true },
        }),
        prisma.user.findMany({
          where: {
            role: "RIDER",
            isOnline: true,
            lastLat: { not: null },
            lastLng: { not: null },
          },
          select: { id: true, lastLat: true, lastLng: true },
        }),
      ]);
      if (restaurant) {
        const riderId = selectNearestRider(
          { lat: restaurant.lat, lng: restaurant.lng },
          riders,
        );
        if (riderId) {
          await prisma.order.update({
            where: { id: order.id },
            data: { riderId },
          });
          const c = notificationContent("ASSIGNED", {
            orderShortId: order.id.slice(-6),
          });
          await createNotification({
            userId: riderId,
            type: "ASSIGNED",
            title: c.title,
            body: c.body,
            orderId: order.id,
            url: `/rider/orders/${order.id}`,
          });
        }
      }
    } catch {
      /* best-effort assignment; order remains claimable */
    }
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
}
