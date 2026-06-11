import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import OrderAdvanceControls from "@/components/OrderAdvanceControls";
import DashboardLive from "@/components/DashboardLive";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TERMINAL: OrderStatus[] = ["DELIVERED", "CANCELLED"];

type OrderRow = Awaited<ReturnType<typeof getOrders>>[number];

function getOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: true,
      restaurant: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
}

function OrderCard({ order }: { order: OrderRow }) {
  const itemSummary = order.items
    .map((i) => `${i.qty}× ${i.name}`)
    .join(", ");
  return (
    <li className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{order.restaurant.name}</p>
          <p className="text-xs text-gray-500">
            #{order.id.slice(-6)} · {order.customer.name} ·{" "}
            {new Date(order.createdAt).toLocaleString("en-US")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-gray-700">{itemSummary}</p>
      <p className="mt-1 text-sm text-gray-500">{order.destAddress}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium">
          {formatPrice(order.subtotalCents)}
        </span>
        <OrderAdvanceControls orderId={order.id} status={order.status} />
      </div>
    </li>
  );
}

export default async function DashboardPage() {
  const orders = await getOrders();
  const active = orders.filter((o) => !TERMINAL.includes(o.status));
  const past = orders.filter((o) => TERMINAL.includes(o.status));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incoming orders</h1>
        <DashboardLive />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Advance each order through the lifecycle — customers see changes live.
        New orders appear here automatically.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="mt-3 text-gray-600">No active orders right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Completed / cancelled ({past.length})
          </h2>
          <ul className="mt-3 space-y-3 opacity-75">
            {past.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
