import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const menuItemCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().positive(),
  category: z.string().trim().max(60).optional(),
  available: z.boolean().default(true),
});

export const menuItemUpdateSchema = menuItemCreateSchema.partial();

export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;

/** The single restaurant owned by this user, or null. */
export function getOwnedRestaurant(userId: string) {
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}
