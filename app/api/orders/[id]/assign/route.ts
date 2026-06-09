import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A rider claims an order that is ready for pickup and not yet assigned.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RIDER") {
    return NextResponse.json(
      { error: "Only riders can claim orders" },
      { status: 403 },
    );
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.riderId && order.riderId !== session.user.id) {
    return NextResponse.json(
      { error: "Order already claimed by another rider" },
      { status: 409 },
    );
  }
  if (order.status !== "READY_FOR_PICKUP") {
    return NextResponse.json(
      { error: "Order is not ready for pickup yet" },
      { status: 409 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { riderId: session.user.id },
  });

  return NextResponse.json({ id: updated.id, riderId: updated.riderId });
}
