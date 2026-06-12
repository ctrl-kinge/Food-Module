import { getCurrentUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { summarizeOrders } from "@/lib/analytics";
import { Container, PageHeader, Card, EmptyState } from "@/components/ui";
import BarChart from "@/components/BarChart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const restaurant = user
    ? await prisma.restaurant.findUnique({
        where: { ownerId: user.id },
        include: { _count: { select: { reviews: true } } },
      })
    : null;

  if (!restaurant) {
    return (
      <Container size="sm">
        <PageHeader title="Analytics" />
        <div className="mt-6">
          <EmptyState message="No restaurant is linked to this account yet." />
        </div>
      </Container>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, createdAt: { gte: since } },
    select: {
      createdAt: true,
      status: true,
      subtotalCents: true,
      items: { select: { name: true, qty: true } },
    },
  });

  const s = summarizeOrders(orders, 14);

  return (
    <Container size="sm">
      <PageHeader
        title="Analytics"
        subtitle="Last 14 days for your restaurant."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-gray-500">Orders</p>
          <p className="text-xl font-bold">{s.totalOrders}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-xl font-bold">{formatPrice(s.totalRevenueCents)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Avg order</p>
          <p className="text-xl font-bold">{formatPrice(s.avgOrderCents)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Avg rating</p>
          <p className="text-xl font-bold">
            {restaurant.avgRating ? restaurant.avgRating.toFixed(1) : "—"}
            <span className="ml-1 text-xs font-normal text-gray-400">
              ({restaurant._count.reviews})
            </span>
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">Orders per day</h2>
        <div className="mt-3">
          <BarChart
            bars={s.perDay.map((d) => ({ label: d.day.slice(5), value: d.count }))}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">Top items</h2>
        {s.topItems.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No sales yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {s.topItems.map((it) => (
              <li
                key={it.name}
                className="flex justify-between text-sm text-gray-700"
              >
                <span>{it.name}</span>
                <span className="font-medium">{it.qty} sold</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
