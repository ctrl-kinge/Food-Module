import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { menuItemUpdateSchema, getOwnedRestaurant } from "@/lib/menu";

async function ownItem(userId: string, itemId: string) {
  const restaurant = await getOwnedRestaurant(userId);
  if (!restaurant) return null;
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.restaurantId !== restaurant.id) return null;
  return item;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const owned = await ownItem(session.user.id, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = menuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const item = await prisma.menuItem.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const owned = await ownItem(session.user.id, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.menuItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
