"use client";

import Link from "next/link";
import { useCart, cartCount, cartSubtotal } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useHasMounted } from "@/lib/useHasMounted";
import { toast } from "@/lib/toast";

export type MenuItemDTO = {
  menuItemId: string;
  name: string;
  description: string | null;
  priceCents: number;
};

export default function MenuList({
  restaurantId,
  restaurantName,
  items,
  isOpen = true,
}: {
  restaurantId: string;
  restaurantName: string;
  items: MenuItemDTO[];
  isOpen?: boolean;
}) {
  const cart = useCart();
  const mounted = useHasMounted();

  const isThisRestaurant = cart.restaurantId === restaurantId;
  const cartItems = mounted && isThisRestaurant ? cart.items : [];

  function handleAdd(item: MenuItemDTO) {
    const payload = {
      menuItemId: item.menuItemId,
      name: item.name,
      priceCents: item.priceCents,
    };
    if (cart.items.length > 0 && cart.restaurantId !== restaurantId) {
      const ok = window.confirm(
        `Your cart has items from ${cart.restaurantName}. Start a new cart from ${restaurantName}?`,
      );
      if (!ok) return;
      cart.startNewCart(restaurantId, restaurantName, payload);
      toast.success(`${item.name} added to cart`);
      return;
    }
    cart.addItem(restaurantId, restaurantName, payload);
    toast.success(`${item.name} added to cart`);
  }

  const qtyOf = (id: string) =>
    cartItems.find((i) => i.menuItemId === id)?.qty ?? 0;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-surface-border">
        {items.map((item) => {
          const qty = qtyOf(item.menuItemId);
          return (
            <li
              key={item.menuItemId}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-sm text-ink-secondary">{item.description}</p>
                )}
                <p className="mt-1 text-sm font-medium">
                  {formatPrice(item.priceCents)}
                </p>
              </div>
              {!isOpen ? (
                <span className="text-sm text-ink-faint">Closed</span>
              ) : qty > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => cart.setQty(item.menuItemId, qty - 1)}
                    className="h-8 w-8 rounded-md border border-surface-border text-lg leading-none hover:border-brand-500"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{qty}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => cart.setQty(item.menuItemId, qty + 1)}
                    className="h-8 w-8 rounded-md border border-surface-border text-lg leading-none hover:border-brand-500"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-surface-deep hover:bg-brand-700"
                >
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-xl border border-surface-border p-4 lg:sticky lg:top-6">
        <h2 className="font-semibold">Your cart</h2>
        {cartItems.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">No items yet.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2 text-sm">
              {cartItems.map((i) => (
                <li key={i.menuItemId} className="flex justify-between gap-2">
                  <span>
                    {i.qty}× {i.name}
                  </span>
                  <span>{formatPrice(i.priceCents * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-surface-border pt-3 font-medium">
              <span>Subtotal</span>
              <span>{formatPrice(cartSubtotal(cartItems))}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 block rounded-md bg-brand-600 px-4 py-2 text-center font-medium text-surface-deep hover:bg-brand-700"
            >
              Checkout ({cartCount(cartItems)})
            </Link>
          </>
        )}
      </aside>
    </div>
  );
}
