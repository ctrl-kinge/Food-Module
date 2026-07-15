import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import ReviewTipPanel from "@/components/ReviewTipPanel";
import ReviewSummary from "@/components/ReviewSummary";
import ReorderButton from "@/components/ReorderButton";
import { Card } from "@/components/ui";

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
    include: { items: true, restaurant: true, review: true },
  });

  // Only the owning customer may view their order.
  if (!order || order.customerId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">Order confirmed</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        From <span className="font-medium">{order.restaurant.name}</span> ·
        order #{order.id.slice(-6)}
      </p>

      <div className="mt-3">
        <ReorderButton
          restaurantId={order.restaurantId}
          restaurantName={order.restaurant.name}
          items={order.items.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            priceCents: i.priceCents,
            qty: i.qty,
          }))}
        />
      </div>

      <div className="mt-6">
        <OrderStatusTracker
          orderId={order.id}
          initialStatus={order.status}
          pickup={{
            lat: order.restaurant.lat,
            lng: order.restaurant.lng,
            label: order.restaurant.name,
          }}
          dest={{
            lat: order.destLat,
            lng: order.destLng,
            label: "Your address",
          }}
        />
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-3 divide-y divide-surface-border">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between py-2 text-sm">
              <span>
                {i.qty}× {i.name}
              </span>
              <span>{formatPrice(i.priceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-surface-border pt-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotalCents)}</span>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Delivering to</h2>
        <p className="mt-2 text-sm text-ink-secondary">{order.destAddress}</p>
        <p className="text-xs text-ink-muted">
          {order.destLat.toFixed(4)}, {order.destLng.toFixed(4)}
        </p>
      </Card>

      {order.status === "DELIVERED" && (
        <div className="mt-6">
          {order.review ? (
            <ReviewSummary
              restaurantRating={order.review.restaurantRating}
              riderRating={order.review.riderRating}
              comment={order.review.comment}
              riderTipCents={order.riderTipCents}
              restaurantTipCents={order.restaurantTipCents}
            />
          ) : (
            <ReviewTipPanel orderId={order.id} />
          )}
        </div>
      )}

      <Link
        href="/restaurants"
        className="mt-6 inline-block text-sm text-brand-600 underline"
      >
        &larr; Back to restaurants
      </Link>
    </div>
  );
}
