import { prisma } from "@/lib/prisma";
import RestaurantCard from "@/components/RestaurantCard";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { menu: true, reviews: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold">Restaurants</h1>
      <p className="mt-1 text-sm text-gray-600">Choose a place to order from.</p>

      {restaurants.length === 0 ? (
        <p className="mt-8 text-gray-600">No restaurants yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              id={r.id}
              name={r.name}
              address={r.address}
              imageUrl={r.imageUrl}
              avgRating={r.avgRating}
              menuCount={r._count.menu}
              reviewCount={r._count.reviews}
            />
          ))}
        </div>
      )}
    </div>
  );
}
