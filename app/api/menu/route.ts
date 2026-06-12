import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { menuItemCreateSchema, getOwnedRestaurant } from "@/lib/menu";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const restaurant = await getOwnedRestaurant(session.user.id);
  if (!restaurant) {
    return NextResponse.json({ error: "No restaurant for this account" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = menuItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const item = await prisma.menuItem.create({
    data: { ...parsed.data, restaurantId: restaurant.id },
  });
  return NextResponse.json(item, { status: 201 });
}
