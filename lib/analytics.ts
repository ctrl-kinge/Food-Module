export type AnalyticsOrder = {
  createdAt: Date | string;
  status: string;
  subtotalCents: number;
  items: { name: string; qty: number }[];
};

export type DayBucket = { day: string; count: number; revenueCents: number };

export type AnalyticsSummary = {
  totalOrders: number;
  deliveredOrders: number;
  totalRevenueCents: number;
  avgOrderCents: number;
  topItems: { name: string; qty: number }[];
  perDay: DayBucket[];
};

const dayKey = (d: Date | string): string =>
  new Date(d).toISOString().slice(0, 10);

/** Aggregate a restaurant's orders. Cancelled orders are excluded from order
 *  counts, revenue, and top items. `perDay` is oldest→newest over `days`. */
export function summarizeOrders(
  orders: AnalyticsOrder[],
  days = 14,
  now: Date = new Date(),
): AnalyticsSummary {
  const active = orders.filter((o) => o.status !== "CANCELLED");
  const totalOrders = active.length;
  const totalRevenueCents = active.reduce((s, o) => s + o.subtotalCents, 0);
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const avgOrderCents = totalOrders
    ? Math.round(totalRevenueCents / totalOrders)
    : 0;

  const itemQty = new Map<string, number>();
  for (const o of active) {
    for (const it of o.items) {
      itemQty.set(it.name, (itemQty.get(it.name) ?? 0) + it.qty);
    }
  }
  const topItems = Array.from(itemQty.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const perDay: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    perDay.push({ day: dayKey(d), count: 0, revenueCents: 0 });
  }
  const idx = new Map(perDay.map((b, i) => [b.day, i]));
  for (const o of active) {
    const i = idx.get(dayKey(o.createdAt));
    if (i != null) {
      perDay[i].count += 1;
      perDay[i].revenueCents += o.subtotalCents;
    }
  }

  return {
    totalOrders,
    deliveredOrders,
    totalRevenueCents,
    avgOrderCents,
    topItems,
    perDay,
  };
}
