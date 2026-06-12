import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedRestaurant } from "@/lib/menu";

const schema = z.object({ isOpen: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const restaurant = await getOwnedRestaurant(session.user.id);
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { isOpen: parsed.data.isOpen },
  });
  return NextResponse.json({ id: updated.id, isOpen: updated.isOpen });
}
