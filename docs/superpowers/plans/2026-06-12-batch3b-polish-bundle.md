# Batch 3b — Polish Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three engagement/polish features — "Order again" reorder from history, saved delivery addresses, and a restaurant analytics dashboard.

**Architecture:** Reorder rebuilds the Zustand cart from a past order's snapshot via a new `replaceCart` action, then sends the customer to that restaurant. Saved addresses get a small `Address` model + owner-scoped CRUD surfaced in checkout. Analytics is a pure `summarizeOrders` helper feeding a dependency-free SVG bar chart on a new `/dashboard/analytics` page (Prisma reads scoped to the owner's restaurant).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind v3, Prisma v6 (Supabase), NextAuth v4, Zod, Zustand, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-11-enhancements-design.md` (§E.3).

**Working directory:** All commands run in `c:\Users\njung\source\repos\food-delivery`. `db:migrate` hits the live Supabase DB (additive; retry `P1001`). Do NOT push; commit onto a `feat/batch3b-polish` branch (controller creates it before Task 1).

---

## File Structure (Batch 3b)

**Create:**
- `components/ReorderButton.tsx` — client "Order again" button
- `app/api/addresses/route.ts` — `GET` list + `POST` create
- `app/api/addresses/[id]/route.ts` — `DELETE` remove
- `components/SavedAddresses.tsx` — client list/select/save/delete in checkout
- `lib/analytics.ts` — `summarizeOrders` pure helper (unit-tested)
- `components/BarChart.tsx` — dependency-free SVG bar chart
- `app/(restaurant)/dashboard/analytics/page.tsx` — analytics page
- `tests/unit/analytics.test.ts`

**Modify:**
- `prisma/schema.prisma` — `Address` model + `User.addresses`
- `lib/cart.ts` — `replaceCart` action
- `tests/unit/cart.test.ts` — `replaceCart` test
- `app/(customer)/orders/[id]/page.tsx` — render `ReorderButton`; restyle onto primitives
- `app/(customer)/orders/page.tsx` — restyle onto primitives (brand tokens)
- `app/(customer)/checkout/page.tsx` — render `SavedAddresses`
- `components/RestaurantHeader.tsx` — add "Analytics" nav link
- `app/(rider)/rider/orders/[id]/page.tsx` — swap leftover `orange-*` → `brand-*` (Batch 1 cleanup)

---

## Task 1: Schema migration — saved addresses

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add the `Address` model + `User` relation**

Append:
```prisma
model Address {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  label     String
  address   String
  lat       Float
  lng       Float
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
}
```
In `model User`, add the relation (near `notifications`/`pushSubscriptions`):
```prisma
  addresses Address[]
```

- [ ] **Step 2: Migrate + generate**

`npm run db:migrate -- --name batch3b_saved_addresses` → "Your database is now in sync with your schema." (retry `P1001`; or `npx prisma migrate deploy`). Then `npm run db:generate`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add Address model for saved delivery addresses"
```

---

## Task 2: `lib/cart.ts` — `replaceCart` action (TDD)

**Files:** Modify `lib/cart.ts`, `tests/unit/cart.test.ts`

- [ ] **Step 1: Add a failing test** to `tests/unit/cart.test.ts` (append a new `describe`/`it` — READ the file first to match its imports/style; it uses `useCart.getState()` / `.setState()` or acts on the store):

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCart } from "@/lib/cart";

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
```
(If `tests/unit/cart.test.ts` doesn't exist, create it with the above plus the imports. If it exists, append the new `describe` and reuse existing imports.)

- [ ] **Step 2: Run — expect FAIL** (`replaceCart` is not a function).
Run: `npx vitest run tests/unit/cart.test.ts`

- [ ] **Step 3: Implement** — in `lib/cart.ts`, add `replaceCart` to the `CartState` type and the store:

Type (after `startNewCart` in the `CartState` type):
```ts
  /** Replace the entire cart with a restaurant + a full set of items (reorder). */
  replaceCart: (
    restaurantId: string,
    restaurantName: string,
    items: CartItem[],
  ) => void;
```
Implementation (after `startNewCart` in the store object):
```ts
      replaceCart: (restaurantId, restaurantName, items) => {
        set({
          restaurantId,
          restaurantName,
          items: items.map((i) => ({ ...i })),
        });
      },
```

- [ ] **Step 4: Run — expect PASS.** `npx vitest run tests/unit/cart.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/cart.ts tests/unit/cart.test.ts
git commit -m "feat(cart): add replaceCart action for reorder, with test"
```

---

## Task 3: ReorderButton + order pages restyle

**Files:** Create `components/ReorderButton.tsx`; Modify `app/(customer)/orders/[id]/page.tsx`, `app/(customer)/orders/page.tsx`

- [ ] **Step 1: `components/ReorderButton.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export default function ReorderButton({
  restaurantId,
  restaurantName,
  items,
}: {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}) {
  const router = useRouter();

  function reorder() {
    useCart.getState().replaceCart(restaurantId, restaurantName, items);
    toast.success("Added to a new cart");
    router.push(`/restaurants/${restaurantId}`);
  }

  return (
    <Button variant="secondary" size="sm" onClick={reorder}>
      Order again
    </Button>
  );
}
```

- [ ] **Step 2: Render it on the order detail page + restyle `app/(customer)/orders/[id]/page.tsx`**

READ the file. Then:
- Import `import ReorderButton from "@/components/ReorderButton";` and `import { Card } from "@/components/ui";` (the page itself only uses `Card`; the reorder `Button` lives inside `ReorderButton`).
- Keep the outer wrapper as the plain `<div className="mx-auto max-w-2xl px-6 py-8">` (so page width is unchanged) — do NOT introduce `Container` here.
- Change the three `<section className="mt-6 rounded-xl border border-gray-200 p-4">` blocks to `<Card className="mt-6">` (and their closing `</section>` to `</Card>`).
- Add the reorder action under the header `<p>` (after the "From … order #…" paragraph):
  ```tsx
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
  ```
- Swap the back-link `text-orange-600` → `text-brand-600`.

- [ ] **Step 3: Restyle `app/(customer)/orders/page.tsx`**

READ the file. This is a token-only swap (no structural/import changes): replace `bg-orange-600` → `bg-brand-600`, `hover:bg-orange-700` → `hover:bg-brand-700`, and `hover:border-orange-500` → `hover:border-brand-500`. Keep the list/data logic and structure unchanged.

- [ ] **Step 4: Verify + commit**

Run `npx tsc --noEmit`, `npm run build`, `npx vitest run` — all clean/pass.
```bash
git add components/ReorderButton.tsx "app/(customer)/orders/[id]/page.tsx" "app/(customer)/orders/page.tsx"
git commit -m "feat(orders): Order again reorder + restyle order pages"
```

---

## Task 4: Saved addresses API

**Files:** Create `app/api/addresses/route.ts`, `app/api/addresses/[id]/route.ts`

- [ ] **Step 1: `GET` list + `POST` create — `app/api/addresses/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(60),
  address: z.string().trim().min(1).max(300),
  lat: z.number().finite(),
  lng: z.number().finite(),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const userId = session.user.id;
  const count = await prisma.address.count({ where: { userId } });
  // First address is the default; honor an explicit isDefault too.
  const makeDefault = parsed.data.isDefault || count === 0;
  const created = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId,
        label: parsed.data.label,
        address: parsed.data.address,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        isDefault: makeDefault,
      },
    });
  });
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: `DELETE` — `app/api/addresses/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await prisma.address.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck + commit**

Run `npx tsc --noEmit` (clean).
```bash
git add app/api/addresses
git commit -m "feat(addresses): saved-address list/create/delete API (owner-scoped)"
```

---

## Task 5: SavedAddresses in checkout

**Files:** Create `components/SavedAddresses.tsx`; Modify `app/(customer)/checkout/page.tsx`

- [ ] **Step 1: `components/SavedAddresses.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";
import type { DeliveryAddress } from "@/components/AddressPicker";

type Saved = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

export default function SavedAddresses({
  current,
  onSelect,
}: {
  current: DeliveryAddress | null;
  onSelect: (a: DeliveryAddress) => void;
}) {
  const [items, setItems] = useState<Saved[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCurrent() {
    if (!current || !current.address) return;
    const label = window.prompt("Save this address as (e.g. Home, Work):");
    if (!label || !label.trim()) return;
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        address: current.address,
        lat: current.lat,
        lng: current.lng,
      }),
    });
    if (!res.ok) return toast.error("Could not save address");
    toast.success("Address saved");
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved address?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete address");
    load();
  }

  return (
    <div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    onSelect({ address: a.address, lat: a.lat, lng: a.lng })
                  }
                  className="font-medium text-gray-800 hover:text-brand-600"
                >
                  {a.label}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${a.label}`}
                  onClick={() => remove(a.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {current && current.address && (
        <div className="mt-2">
          <Button variant="ghost" size="sm" onClick={saveCurrent}>
            Save current address
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `app/(customer)/checkout/page.tsx`**

READ the file. Add `import SavedAddresses from "@/components/SavedAddresses";`. Inside the "Delivery location" `<Card>`, render `SavedAddresses` ABOVE the `<AddressPicker />`:
```tsx
      <Card className="mt-6">
        <h2 className="font-semibold">Delivery location</h2>
        <div className="mt-3">
          <SavedAddresses current={addr} onSelect={setAddr} />
        </div>
        <div className="mt-3">
          <AddressPicker onChange={setAddr} />
        </div>
      </Card>
```
Keep `addr`/`setAddr` state and `placeOrder` exactly as-is. (Selecting a saved address sets `addr`, which is what `placeOrder` uses; the map preview in `AddressPicker` is for entering a new one.)

- [ ] **Step 3: Build + commit**

Run `npx tsc --noEmit` (clean), `npm run build` (compiles).
```bash
git add components/SavedAddresses.tsx "app/(customer)/checkout/page.tsx"
git commit -m "feat(addresses): saved addresses in checkout (select/save/delete)"
```

---

## Task 6: `lib/analytics.ts` — order summary (TDD)

**Files:** Create `lib/analytics.ts`; Test `tests/unit/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/analytics.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL** (`Failed to resolve import "@/lib/analytics"`).
Run: `npx vitest run tests/unit/analytics.test.ts`

- [ ] **Step 3: Implement `lib/analytics.ts`**

```ts
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
  const topItems = [...itemQty.entries()]
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
```

- [ ] **Step 4: Run — expect PASS (4 tests).** `npx vitest run tests/unit/analytics.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/analytics.ts tests/unit/analytics.test.ts
git commit -m "feat(analytics): summarizeOrders helper with tests"
```

---

## Task 7: Analytics page + bar chart + nav

**Files:** Create `components/BarChart.tsx`, `app/(restaurant)/dashboard/analytics/page.tsx`; Modify `components/RestaurantHeader.tsx`

- [ ] **Step 1: `components/BarChart.tsx` (dependency-free SVG)**

```tsx
type Bar = { label: string; value: number };

/** Minimal responsive SVG bar chart. Labels are sparse to avoid clutter. */
export default function BarChart({
  bars,
  height = 120,
}: {
  bars: Bar[];
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const barW = 100 / Math.max(1, bars.length);
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="h-32 w-full"
      role="img"
      aria-label="Orders per day"
    >
      {bars.map((b, i) => {
        const h = (b.value / max) * (height - 16);
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={height - h}
            width={barW * 0.7}
            height={h}
            rx={0.6}
            className="fill-brand-500"
          >
            <title>{`${b.label}: ${b.value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: `app/(restaurant)/dashboard/analytics/page.tsx`**

```tsx
import { getCurrentUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { summarizeOrders } from "@/lib/analytics";
import { Container, PageHeader, Card, EmptyState } from "@/components/ui";
import BarChart from "@/components/BarChart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const restaurant = user
    ? await prisma.restaurant.findUnique({
        where: { ownerId: user.id },
        include: { _count: { select: { reviews: true } } },
      })
    : null;

  if (!restaurant) {
    return (
      <Container size="sm">
        <PageHeader title="Analytics" />
        <div className="mt-6">
          <EmptyState message="No restaurant is linked to this account yet." />
        </div>
      </Container>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id, createdAt: { gte: since } },
    select: {
      createdAt: true,
      status: true,
      subtotalCents: true,
      items: { select: { name: true, qty: true } },
    },
  });

  const s = summarizeOrders(orders, 14);

  return (
    <Container size="sm">
      <PageHeader
        title="Analytics"
        subtitle="Last 14 days for your restaurant."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-gray-500">Orders</p>
          <p className="text-xl font-bold">{s.totalOrders}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-xl font-bold">{formatPrice(s.totalRevenueCents)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Avg order</p>
          <p className="text-xl font-bold">{formatPrice(s.avgOrderCents)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Avg rating</p>
          <p className="text-xl font-bold">
            {restaurant.avgRating ? restaurant.avgRating.toFixed(1) : "—"}
            <span className="ml-1 text-xs font-normal text-gray-400">
              ({restaurant._count.reviews})
            </span>
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">Orders per day</h2>
        <div className="mt-3">
          <BarChart
            bars={s.perDay.map((d) => ({ label: d.day.slice(5), value: d.count }))}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">Top items</h2>
        {s.topItems.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No sales yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {s.topItems.map((it) => (
              <li
                key={it.name}
                className="flex justify-between text-sm text-gray-700"
              >
                <span>{it.name}</span>
                <span className="font-medium">{it.qty} sold</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
```

- [ ] **Step 3: Add "Analytics" to `components/RestaurantHeader.tsx`**

In the `<nav>` (which has Orders + Menu links), add after the Menu link:
```tsx
            <Link
              href="/dashboard/analytics"
              className="text-gray-700 hover:text-brand-600"
            >
              Analytics
            </Link>
```

- [ ] **Step 4: Build + commit**

Run `npx tsc --noEmit` (clean), `npm run build` (compiles; `/dashboard/analytics` in the route list).
```bash
git add components/BarChart.tsx "app/(restaurant)/dashboard/analytics" components/RestaurantHeader.tsx
git commit -m "feat(analytics): restaurant analytics page with SVG chart + nav"
```

---

## Task 8: Cleanup leftover + final verification

**Files:** Modify `app/(rider)/rider/orders/[id]/page.tsx`

- [ ] **Step 1: Brand-token cleanup**

In `app/(rider)/rider/orders/[id]/page.tsx`, READ it and replace any `orange-*` utility classes with the matching `brand-*` (Batch 1 leftover; classes render identically but this finishes the migration). Do not change any logic.

- [ ] **Step 2: Full sweep**

Run:
- `npm run build` → compiles
- `npx vitest run` → all pass (33 existing + replaceCart + 4 analytics ≈ 38)
- `npm run lint` → no errors
- `npm run test:e2e` → existing specs still pass

- [ ] **Step 3: Commit**

```bash
git add "app/(rider)/rider/orders/[id]/page.tsx"
git commit -m "style(ui): finish brand-token migration on rider order detail"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Task 1 = `Address` schema. Tasks 2–3 = reorder (§E.3). Tasks 4–5 = saved addresses (§E.3). Tasks 6–7 = restaurant analytics (§E.3). Task 8 = leftover cleanup + verification.
- **Reorder UX:** populates the cart from the order snapshot and sends the customer to the restaurant page (so they see the current menu and can checkout). The order-create route already re-validates item availability server-side, so unavailable items are caught at checkout.
- **Saved addresses** are owner-scoped (every route filters by `session.user.id`); selecting one sets the checkout `addr` used by `placeOrder`.
- **Analytics** reads are scoped to the owner's restaurant; `summarizeOrders` is pure (deterministic via the injected `now` in tests) and excludes cancelled orders.
- **DB is the live Supabase instance** — additive migration; retry `P1001`.
- **This is the final batch** of the enhancement effort.
```
