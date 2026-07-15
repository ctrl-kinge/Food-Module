import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const orders = await prisma.order.findMany({
    where: { customerId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true } }, items: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-surface-border p-8 text-center">
          <p className="text-ink-secondary">You haven&rsquo;t ordered anything yet.</p>
          <Link
            href="/restaurants"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-surface-deep hover:bg-brand-700"
          >
            Browse restaurants
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block rounded-xl border border-surface-border p-4 transition hover:border-brand-500 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.restaurant.name}</p>
                    <p className="text-xs text-ink-muted">
                      #{o.id.slice(-6)} ·{" "}
                      {new Date(o.createdAt).toLocaleString("en-US")} ·{" "}
                      {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={o.status} />
                    <p className="mt-1 text-sm font-medium">
                      {formatPrice(o.subtotalCents)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
