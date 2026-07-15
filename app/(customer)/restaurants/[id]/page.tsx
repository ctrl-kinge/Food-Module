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
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      },
    },
  });

  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/restaurants" className="text-sm text-brand-600 underline">
        &larr; All restaurants
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{restaurant.name}</h1>
      <p className="mt-1 text-sm text-ink-secondary">{restaurant.address}</p>
      <div className="mt-2">
        <Rating
          rating={restaurant.avgRating}
          count={restaurant._count.reviews}
        />
      </div>

      {!restaurant.isOpen && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          This restaurant is currently closed and isn&apos;t accepting orders.
        </p>
      )}

      {restaurant.menu.length === 0 ? (
        <p className="mt-8 text-ink-secondary">No items available right now.</p>
      ) : (
        <MenuList
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          isOpen={restaurant.isOpen}
          items={restaurant.menu.map((m) => ({
            menuItemId: m.id,
            name: m.name,
            description: m.description,
            priceCents: m.priceCents,
          }))}
        />
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Reviews
          {restaurant._count.reviews > 0 && ` (${restaurant._count.reviews})`}
        </h2>
        {restaurant.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">No reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {restaurant.reviews.map((rv) => (
              <li key={rv.id} className="rounded-xl border border-surface-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{rv.customer.name}</span>
                  <span
                    className="text-sm text-amber-500"
                    aria-label={`${rv.restaurantRating} of 5`}
                  >
                    {"★".repeat(rv.restaurantRating)}
                    <span className="text-ink-faint">
                      {"★".repeat(5 - rv.restaurantRating)}
                    </span>
                  </span>
                </div>
                {rv.comment && (
                  <p className="mt-2 text-sm text-ink-secondary">{rv.comment}</p>
                )}
                <p className="mt-1 text-xs text-ink-faint">
                  {new Date(rv.createdAt).toLocaleDateString("en-US")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
