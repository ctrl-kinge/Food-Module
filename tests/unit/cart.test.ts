import { describe, it, expect, beforeEach } from "vitest";
import { useCart, cartCount, cartSubtotal } from "@/lib/cart";

const itemA = { menuItemId: "a", name: "Item A", priceCents: 300 };
const itemB = { menuItemId: "b", name: "Item B", priceCents: 1200 };

function reset() {
  useCart.setState({ restaurantId: null, restaurantName: null, items: [] });
}

describe("cart store", () => {
  beforeEach(reset);

  it("adds and increments items for one restaurant", () => {
    useCart.getState().addItem("r1", "Resto 1", itemA);
    useCart.getState().addItem("r1", "Resto 1", itemA);
    const s = useCart.getState();
    expect(s.restaurantId).toBe("r1");
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(2);
    expect(cartCount(s.items)).toBe(2);
    expect(cartSubtotal(s.items)).toBe(600);
  });

  it("sums the subtotal across distinct items", () => {
    useCart.getState().addItem("r1", "Resto 1", itemA);
    useCart.getState().addItem("r1", "Resto 1", itemB);
    expect(cartSubtotal(useCart.getState().items)).toBe(1500);
  });

  it("locks to one restaurant: adding from another resets the cart", () => {
    useCart.getState().addItem("r1", "Resto 1", itemA);
    useCart.getState().addItem("r2", "Resto 2", itemB);
    const s = useCart.getState();
    expect(s.restaurantId).toBe("r2");
    expect(s.items).toHaveLength(1);
    expect(s.items[0].menuItemId).toBe("b");
  });

  it("startNewCart replaces the cart", () => {
    useCart.getState().addItem("r1", "Resto 1", itemA);
    useCart.getState().startNewCart("r2", "Resto 2", itemB);
    const s = useCart.getState();
    expect(s.restaurantId).toBe("r2");
    expect(s.items).toHaveLength(1);
  });

  it("setQty to zero removes the item and clears the restaurant when empty", () => {
    useCart.getState().addItem("r1", "Resto 1", itemA);
    useCart.getState().setQty("a", 0);
    const s = useCart.getState();
    expect(s.items).toHaveLength(0);
    expect(s.restaurantId).toBeNull();
  });
});

describe("replaceCart", () => {
  beforeEach(() => {
    useCart.getState().clear();
  });

  it("replaces the whole cart with a restaurant + items wholesale", () => {
    useCart.getState().addItem("r1", "Old Place", {
      menuItemId: "x",
      name: "X",
      priceCents: 100,
    });
    useCart.getState().replaceCart("r2", "New Place", [
      { menuItemId: "a", name: "A", priceCents: 500, qty: 2 },
      { menuItemId: "b", name: "B", priceCents: 300, qty: 1 },
    ]);
    const s = useCart.getState();
    expect(s.restaurantId).toBe("r2");
    expect(s.restaurantName).toBe("New Place");
    expect(s.items).toHaveLength(2);
    expect(s.items.find((i) => i.menuItemId === "a")?.qty).toBe(2);
  });
});
