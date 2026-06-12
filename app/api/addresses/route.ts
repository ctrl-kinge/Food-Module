import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(60),
  address: z.string().trim().min(1).max(300),
  lat: z.number().finite(),
  lng: z.number().finite(),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const userId = session.user.id;
  const count = await prisma.address.count({ where: { userId } });
  // First address is the default; honor an explicit isDefault too.
  const makeDefault = parsed.data.isDefault || count === 0;
  const created = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId,
        label: parsed.data.label,
        address: parsed.data.address,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        isDefault: makeDefault,
      },
    });
  });
  return NextResponse.json(created, { status: 201 });
}
