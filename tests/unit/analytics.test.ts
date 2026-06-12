import { describe, it, expect } from "vitest";
import { summarizeOrders } from "@/lib/analytics";

const NOW = new Date("2026-06-12T12:00:00Z");

function order(day: string, status: string, subtotalCents: number, items: { name: string; qty: number }[]) {
  return { createdAt: `${day}T09:00:00Z`, status, subtotalCents, items };
}

describe("summarizeOrders", () => {
  const orders = [
    order("2026-06-12", "DELIVERED", 1000, [{ name: "Pizza", qty: 2 }]),
    order("2026-06-12", "EN_ROUTE", 500, [{ name: "Pizza", qty: 1 }, { name: "Soda", qty: 1 }]),
    order("2026-06-11", "CANCELLED", 999, [{ name: "Pizza", qty: 5 }]),
  ];

  it("excludes cancelled orders from totals and revenue", () => {
    const s = summarizeOrders(orders, 14, NOW);
    expect(s.totalOrders).toBe(2);
    expect(s.totalRevenueCents).toBe(1500);
    expect(s.deliveredOrders).toBe(1);
    expect(s.avgOrderCents).toBe(750);
  });

  it("ranks top items by quantity, ignoring cancelled", () => {
    const s = summarizeOrders(orders, 14, NOW);
    expect(s.topItems[0]).toEqual({ name: "Pizza", qty: 3 });
    expect(s.topItems.find((i) => i.name === "Soda")?.qty).toBe(1);
  });

  it("buckets per day over the window (oldest→newest), today last", () => {
    const s = summarizeOrders(orders, 14, NOW);
    expect(s.perDay).toHaveLength(14);
    expect(s.perDay.at(-1)?.day).toBe("2026-06-12");
    expect(s.perDay.at(-1)?.count).toBe(2);
    expect(s.perDay.at(-1)?.revenueCents).toBe(1500);
  });

  it("handles no orders", () => {
    const s = summarizeOrders([], 14, NOW);
    expect(s.totalOrders).toBe(0);
    expect(s.avgOrderCents).toBe(0);
    expect(s.topItems).toEqual([]);
  });
});
