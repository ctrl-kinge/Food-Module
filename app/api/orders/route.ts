import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OrderSchema = z.object({
  restaurantId: z.string().min(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
  destAddress: z.string().min(1),
  destLat: z.number().finite(),
  destLng: z.number().finite(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "CUSTOMER") {
    return NextResponse.json(
      { error: "Only customers can place orders" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { restaurantId, items, destAddress, destLat, destLng } = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isOpen: true, ownerId: true, name: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  if (!restaurant.isOpen) {
    return NextResponse.json(
      { error: "This restaurant is currently closed" },
      { status: 409 },
    );
  }

  // Snapshot authoritative names/prices from the DB — never trust client prices.
  const ids = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId, available: true },
  });
  if (menuItems.length !== ids.length) {
    return NextResponse.json(
      { error: "Some items are no longer available" },
      { status: 400 },
    );
  }

  const qtyById = new Map(items.map((i) => [i.menuItemId, i.qty]));
  const orderItems = menuItems.map((m) => ({
    menuItemId: m.id,
    name: m.name,
    priceCents: m.priceCents,
    qty: qtyById.get(m.id) ?? 1,
  }));
  const subtotalCents = orderItems.reduce(
    (sum, i) => sum + i.priceCents * i.qty,
    0,
  );

  const order = await prisma.order.create({
    data: {
      customerId: session.user.id,
      restaurantId,
      status: "PLACED",
      destAddress,
      destLat,
      destLng,
      subtotalCents,
      items: { create: orderItems },
    },
  });

  if (restaurant.ownerId) {
    const { notificationContent } = await import("@/lib/notify-format");
    const { createNotification } = await import("@/lib/notify");
    const c = notificationContent("NEW_ORDER", { orderShortId: order.id.slice(-6) });
    await createNotification({
      userId: restaurant.ownerId,
      type: "NEW_ORDER",
      title: c.title,
      body: c.body,
      orderId: order.id,
      url: "/dashboard",
    });
  }

  return NextResponse.json({ id: order.id }, { status: 201 });
}
