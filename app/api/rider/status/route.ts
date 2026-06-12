import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isOnline: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RIDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // A rider can't go offline while a delivery is still in progress.
  if (!parsed.data.isOnline) {
    const active = await prisma.order.count({
      where: {
        riderId: session.user.id,
        status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "EN_ROUTE"] },
      },
    });
    if (active > 0) {
      return NextResponse.json(
        { error: "Finish your active delivery before going offline" },
        { status: 409 },
      );
    }
  }
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { isOnline: parsed.data.isOnline },
  });
  return NextResponse.json({ id: user.id, isOnline: user.isOnline });
}
