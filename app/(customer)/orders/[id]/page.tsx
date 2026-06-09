import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, restaurant: true },
  });

  // Only the owning customer may view their order.
  if (!order || order.customerId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order confirmed</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        From <span className="font-medium">{order.restaurant.name}</span> ·
        order #{order.id.slice(-6)}
      </p>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2 text-sm">
              <span>
                {i.qty}× {i.name}
              </span>
              <span>{formatPrice(i.priceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotalCents)}</span>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Delivering to</h2>
        <p className="mt-2 text-sm text-gray-700">{order.destAddress}</p>
        <p className="text-xs text-gray-500">
          {order.destLat.toFixed(4)}, {order.destLng.toFixed(4)}
        </p>
      </section>

      <p className="mt-6 rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
        Live tracking with a moving rider and traffic-aware ETA arrives in
        Phases 3–5. For now this confirms your order is saved.
      </p>

      <Link
        href="/restaurants"
        className="mt-6 inline-block text-sm text-orange-600 underline"
      >
        &larr; Back to restaurants
      </Link>
    </div>
  );
}
