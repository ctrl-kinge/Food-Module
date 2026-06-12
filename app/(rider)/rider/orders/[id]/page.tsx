import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import DeliveryMap from "@/components/DeliveryMap";
import OrderAdvanceControls from "@/components/OrderAdvanceControls";
import LocationBroadcaster from "@/components/LocationBroadcaster";

export const dynamic = "force-dynamic";

export default async function RiderOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, restaurant: true },
  });

  // Only the assigned rider may open a delivery.
  if (!order || order.riderId !== session!.user.id) notFound();

  const pickup = {
    lat: order.restaurant.lat,
    lng: order.restaurant.lng,
    label: order.restaurant.name,
  };
  const dest = { lat: order.destLat, lng: order.destLng, label: "Customer" };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/rider/orders" className="text-sm text-brand-600 underline">
        &larr; All deliveries
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery #{order.id.slice(-6)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Pickup <span className="font-medium">{order.restaurant.name}</span> →
        drop-off {order.destAddress}
      </p>

      <div className="mt-6">
        <DeliveryMap pickup={pickup} dest={dest} />
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Update status</h2>
        <div className="mt-3">
          <OrderAdvanceControls
            orderId={order.id}
            status={order.status}
            showCancel={false}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Mark <em>Picked up</em> at the restaurant, <em>En route</em> when
          driving, and <em>Delivered</em> on arrival.
        </p>
      </section>

      <div className="mt-6">
        <LocationBroadcaster
          orderId={order.id}
          pickup={{ lat: pickup.lat, lng: pickup.lng }}
          dest={{ lat: dest.lat, lng: dest.lng }}
        />
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Order</h2>
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
    </div>
  );
}
