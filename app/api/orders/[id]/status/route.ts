import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { OrderStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NEXT_STATUS, canCancel, ALL_STATUSES } from "@/lib/order-status";

const StatusSchema = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
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

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: target },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
