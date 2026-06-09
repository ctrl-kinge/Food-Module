"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, cartSubtotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useHasMounted } from "@/lib/useHasMounted";
import AddressPicker, { type DeliveryAddress } from "@/components/AddressPicker";

export default function CheckoutPage() {
  const mounted = useHasMounted();
  const router = useRouter();
  const cart = useCart();
  const [addr, setAddr] = useState<DeliveryAddress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  if (!mounted) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-gray-600">Loading…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-gray-600">Your cart is empty.</p>
        <Link
          href="/restaurants"
          className="mt-4 inline-block rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
        >
          Browse restaurants
        </Link>
      </div>
    );
  }

  const addressValid =
    !!addr &&
    addr.address.length > 0 &&
    Number.isFinite(addr.lat) &&
    Number.isFinite(addr.lng);

  async function placeOrder() {
    if (!addressValid || !cart.restaurantId || !addr) return;
    setPlacing(true);
    setError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: cart.restaurantId,
        items: cart.items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
        destAddress: addr.address,
        destLat: addr.lat,
        destLng: addr.lng,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not place order.");
      setPlacing(false);
      return;
    }

    const data = await res.json();
    cart.clear();
    router.push(`/orders/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-gray-600">
        Ordering from <span className="font-medium">{cart.restaurantName}</span>
      </p>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Your order</h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {cart.items.map((i) => (
            <li key={i.menuItemId} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove one ${i.name}`}
                  onClick={() => cart.setQty(i.menuItemId, i.qty - 1)}
                  className="h-7 w-7 rounded-md border border-gray-300 text-lg leading-none hover:border-orange-500"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{i.qty}</span>
                <button
                  type="button"
                  aria-label={`Add one ${i.name}`}
                  onClick={() => cart.setQty(i.menuItemId, i.qty + 1)}
                  className="h-7 w-7 rounded-md border border-gray-300 text-lg leading-none hover:border-orange-500"
                >
                  +
                </button>
                <span className="ml-2">{i.name}</span>
              </div>
              <span className="text-sm font-medium">
                {formatPrice(i.priceCents * i.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(cartSubtotal(cart.items))}</span>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold">Delivery location</h2>
        <div className="mt-3">
          <AddressPicker onChange={setAddr} />
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={placeOrder}
        disabled={!addressValid || placing}
        className="mt-6 w-full rounded-md bg-orange-600 px-4 py-3 font-medium text-white transition hover:bg-orange-700 disabled:opacity-60"
      >
        {placing
          ? "Placing order…"
          : `Place order · ${formatPrice(cartSubtotal(cart.items))}`}
      </button>
      {!addressValid && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Choose a delivery location to continue.
        </p>
      )}
    </div>
  );
}
