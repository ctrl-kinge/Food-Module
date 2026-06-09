import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Rating from "@/components/Rating";
import MenuList from "@/components/MenuList";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.id },
    include: {
      menu: { where: { available: true }, orderBy: { name: "asc" } },
      _count: { select: { reviews: true } },
    },
  });

  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/restaurants" className="text-sm text-orange-600 underline">
        &larr; All restaurants
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{restaurant.name}</h1>
      <p className="mt-1 text-sm text-gray-600">{restaurant.address}</p>
      <div className="mt-2">
        <Rating
          rating={restaurant.avgRating}
          count={restaurant._count.reviews}
        />
      </div>

      {restaurant.menu.length === 0 ? (
        <p className="mt-8 text-gray-600">No items available right now.</p>
      ) : (
        <MenuList
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          items={restaurant.menu.map((m) => ({
            menuItemId: m.id,
            name: m.name,
            description: m.description,
            priceCents: m.priceCents,
          }))}
        />
      )}
    </div>
  );
}
