import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ClaimButton from "@/components/ClaimButton";

export const dynamic = "force-dynamic";

type RiderOrder = Awaited<ReturnType<typeof fetchAvailable>>[number];

function fetchAvailable() {
  return prisma.order.findMany({
    where: { status: "READY_FOR_PICKUP", riderId: null },
    orderBy: { createdAt: "asc" },
    include: {
      restaurant: { select: { name: true, address: true } },
      items: true,
    },
  });
}

function OrderCard({
  order,
  action,
}: {
  order: RiderOrder;
  action: React.ReactNode;
}) {
  const itemSummary = order.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
  return (
    <li className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{order.restaurant.name}</p>
          <p className="text-xs text-gray-500">
            Pickup: {order.restaurant.address}
          </p>
          <p className="text-xs text-gray-500">Drop-off: {order.destAddress}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-gray-700">{itemSummary}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium">
          {formatPrice(order.subtotalCents)}
        </span>
        {action}
      </div>
    </li>
  );
}

export default async function RiderOrdersPage() {
  const session = await getServerSession(authOptions);
  const riderId = session!.user.id;

  const [available, mine] = await Promise.all([
    fetchAvailable(),
    prisma.order.findMany({
      where: {
        riderId,
        status: { in: ["READY_FOR_PICKUP", "PICKED_UP", "EN_ROUTE"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: { select: { name: true, address: true } },
        items: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold">Deliveries</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          In progress ({mine.length})
        </h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-gray-600">No active deliveries.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {mine.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                action={
                  <Link
                    href={`/rider/orders/${o.id}`}
                    className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                  >
                    Open
                  </Link>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Available to claim ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="mt-3 text-gray-600">
            Nothing ready for pickup right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {available.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                action={<ClaimButton orderId={o.id} />}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
