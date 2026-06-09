import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  menuItemId: string;
  name: string;
  priceCents: number;
  qty: number;
};

type CartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];

  /** Add/increment an item for the cart's current restaurant. */
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: Omit<CartItem, "qty">,
  ) => void;
  /** Clear the cart and start fresh from a different restaurant. */
  startNewCart: (
    restaurantId: string,
    restaurantName: string,
    item: Omit<CartItem, "qty">,
  ) => void;
  setQty: (menuItemId: string, qty: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],

      addItem: (restaurantId, restaurantName, item) => {
        const state = get();
        const sameRestaurant = state.restaurantId === restaurantId;
        const items = sameRestaurant ? state.items : [];
        const existing = items.find((i) => i.menuItemId === item.menuItemId);
        const nextItems = existing
          ? items.map((i) =>
              i.menuItemId === item.menuItemId ? { ...i, qty: i.qty + 1 } : i,
            )
          : [...items, { ...item, qty: 1 }];
        set({ restaurantId, restaurantName, items: nextItems });
      },

      startNewCart: (restaurantId, restaurantName, item) => {
        set({ restaurantId, restaurantName, items: [{ ...item, qty: 1 }] });
      },

      setQty: (menuItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, qty } : i,
          ),
        });
      },

      removeItem: (menuItemId) => {
        const items = get().items.filter((i) => i.menuItemId !== menuItemId);
        set(
          items.length === 0
            ? { items, restaurantId: null, restaurantName: null }
            : { items },
        );
      },

      clear: () => set({ items: [], restaurantId: null, restaurantName: null }),
    }),
    { name: "fd-cart" },
  ),
);

/** Total number of units in the cart. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** Subtotal in cents. */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
}
