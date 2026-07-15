"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, cartSubtotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useHasMounted } from "@/lib/useHasMounted";
import { toast } from "@/lib/toast";
import { getSocket } from "@/lib/socket-client";
import AddressPicker, { type DeliveryAddress } from "@/components/AddressPicker";
import SavedAddresses from "@/components/SavedAddresses";
import { Card, Button } from "@/components/ui";

export default function CheckoutPage() {
  const mounted = useHasMounted();
  const router = useRouter();
  const cart = useCart();
  const [addr, setAddr] = useState<DeliveryAddress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  if (!mounted) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-ink-secondary">Loading…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-ink-secondary">Your cart is empty.</p>
        <Link
          href="/restaurants"
          className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-surface-deep hover:bg-brand-700"
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
    toast.success("Order placed!");
    // Nudge any open restaurant dashboard to refresh.
    try {
      getSocket().emit("dashboard:notify");
    } catch {
      /* hub offline; dashboard will catch it on next manual refresh */
    }
    router.push(`/orders/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Ordering from <span className="font-medium">{cart.restaurantName}</span>
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Your order</h2>
        <ul className="mt-3 divide-y divide-surface-border">
          {cart.items.map((i) => (
            <li key={i.menuItemId} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove one ${i.name}`}
                  onClick={() => cart.setQty(i.menuItemId, i.qty - 1)}
                  className="h-7 w-7 rounded-md border border-surface-border text-lg leading-none hover:border-brand-500"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{i.qty}</span>
                <button
                  type="button"
                  aria-label={`Add one ${i.name}`}
                  onClick={() => cart.setQty(i.menuItemId, i.qty + 1)}
                  className="h-7 w-7 rounded-md border border-surface-border text-lg leading-none hover:border-brand-500"
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
        <div className="mt-3 flex justify-between border-t border-surface-border pt-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(cartSubtotal(cart.items))}</span>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Delivery location</h2>
        <div className="mt-3">
          <SavedAddresses current={addr} onSelect={setAddr} />
        </div>
        <div className="mt-3">
          <AddressPicker onChange={setAddr} />
        </div>
      </Card>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Button
        type="button"
        onClick={placeOrder}
        disabled={!addressValid || placing}
        loading={placing}
        className="mt-6 w-full py-3"
      >
        {placing
          ? "Placing order…"
          : `Place order · ${formatPrice(cartSubtotal(cart.items))}`}
      </Button>
      {!addressValid && (
        <p className="mt-2 text-center text-xs text-ink-muted">
          Choose a delivery location to continue.
        </p>
      )}
    </div>
  );
}
