import { prisma } from "@/lib/prisma";
import RestaurantCard from "@/components/RestaurantCard";
import { Container, PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { menu: true, reviews: true } } },
  });

  return (
    <Container>
      <PageHeader title="Restaurants" subtitle="Choose a place to order from." />
      {restaurants.length === 0 ? (
        <div className="mt-8">
          <EmptyState message="No restaurants yet." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              id={r.id}
              name={r.name}
              address={r.address}
              imageUrl={r.imageUrl}
              isOpen={r.isOpen}
              avgRating={r.avgRating}
              menuCount={r._count.menu}
              reviewCount={r._count.reviews}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
