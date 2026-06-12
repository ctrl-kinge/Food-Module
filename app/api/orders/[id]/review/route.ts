import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chargeTip } from "@/lib/stripe";

const ReviewSchema = z.object({
  restaurantRating: z.number().int().min(1).max(5),
  riderRating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  riderTipCents: z.number().int().min(0).max(1_000_000).default(0),
  restaurantTipCents: z.number().int().min(0).max(1_000_000).default(0),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { restaurantRating, riderRating, comment, riderTipCents, restaurantTipCents } =
    parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { review: true },
  });
  if (!order || order.customerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json(
      { error: "You can review only after delivery" },
      { status: 409 },
    );
  }
  if (order.review) {
    return NextResponse.json(
      { error: "This order has already been reviewed" },
      { status: 409 },
    );
  }

  // Charge tips (or simulate when Stripe isn't configured).
  const riderTip = await chargeTip(riderTipCents, `Rider tip · order ${order.id}`);
  const restaurantTip = await chargeTip(
    restaurantTipCents,
    `Restaurant tip · order ${order.id}`,
  );
  if (!riderTip.ok || !restaurantTip.ok) {
    return NextResponse.json(
      { error: riderTip.error ?? restaurantTip.error ?? "Tip payment failed" },
      { status: 402 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        orderId: order.id,
        customerId: session.user.id,
        restaurantId: order.restaurantId,
        restaurantRating,
        riderRating,
        comment: comment?.trim() ? comment.trim() : null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { riderTipCents, restaurantTipCents },
    });
    const agg = await tx.review.aggregate({
      where: { restaurantId: order.restaurantId },
      _avg: { restaurantRating: true },
    });
    await tx.restaurant.update({
      where: { id: order.restaurantId },
      data: { avgRating: agg._avg.restaurantRating ?? 0 },
    });
  });

  {
    const { notificationContent } = await import("@/lib/notify-format");
    const { createNotification } = await import("@/lib/notify");
    const c = notificationContent("REVIEW", { orderShortId: order.id.slice(-6) });
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { ownerId: true },
    });
    if (restaurant?.ownerId) {
      await createNotification({
        userId: restaurant.ownerId,
        type: "REVIEW",
        title: c.title,
        body: c.body,
        orderId: order.id,
        url: "/dashboard",
      });
    }
    if (order.riderId) {
      await createNotification({
        userId: order.riderId,
        type: "REVIEW",
        title: c.title,
        body: c.body,
        orderId: order.id,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    simulatedTips: riderTip.simulated || restaurantTip.simulated,
  });
}
