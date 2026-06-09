import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NEXT_STATUS, canCancel, ALL_STATUSES } from "@/lib/order-status";

const StatusSchema = z.object({
  status: z.enum(
    ALL_STATUSES as [string, ...string[]],
  ),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Phase 3: status is advanced from the restaurant dashboard.
  // (Phase 4 will also let riders set PICKED_UP/EN_ROUTE/DELIVERED.)
  if (session.user.role !== "RESTAURANT") {
    return NextResponse.json(
      { error: "Only restaurants can update order status" },
      { status: 403 },
    );
  }

  const parsed = StatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const target = parsed.data.status as (typeof ALL_STATUSES)[number];

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isForward = NEXT_STATUS[order.status] === target;
  const isCancel = target === "CANCELLED" && canCancel(order.status);
  if (!isForward && !isCancel) {
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
