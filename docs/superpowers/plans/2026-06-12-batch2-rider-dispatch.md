# Batch 2 — Rider Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give riders an online/offline availability state, auto-assign each ready order to the nearest online rider (with manual claim as the fallback), and let restaurants reject orders with a reason and set a prep-time estimate on accept.

**Architecture:** Add availability + last-known-position to `User` and `prepMinutes`/`cancelReason` to `Order`. A pure `selectNearestRider` helper drives assignment from the existing order **status route** at the `PREPARING → READY_FOR_PICKUP` transition (the moment an order becomes claimable). Riders broadcast position to a new lightweight endpoint while online. No socket-hub changes — stored notifications and per-user realtime are deferred to Batch 3; the rider list refreshes on load/poll.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind v3, Prisma v6 (Supabase Postgres), NextAuth v4, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-11-enhancements-design.md` (sections B-batch2, D).

**Working directory:** All commands run in `c:\Users\njung\source\repos\food-delivery` (NOT the KhetiaIS workspace). `db:migrate` hits the live Supabase DB; the pooler cold-starts with `P1001` — retry 2-4×. Do NOT push; commit onto a `feat/batch2-rider-dispatch` branch (the controller creates it before Task 1).

---

## File Structure (Batch 2)

**Create:**
- `lib/dispatch.ts` — `selectNearestRider` pure helper (unit-tested)
- `app/api/rider/status/route.ts` — `PATCH` online/offline
- `app/api/rider/location/route.ts` — `PATCH` last-known position
- `components/RiderAvailability.tsx` — client online/offline toggle + position broadcaster
- `tests/unit/dispatch.test.ts`

**Modify:**
- `prisma/schema.prisma` — `User.isOnline/lastLat/lastLng`, `Order.prepMinutes/cancelReason`
- `app/api/orders/[id]/status/route.ts` — auto-assign on READY_FOR_PICKUP; accept `prepMinutes`/`reason`
- `app/(rider)/rider/orders/page.tsx` — render `RiderAvailability`, pass initial `isOnline`; restyle onto primitives
- `components/OrderAdvanceControls.tsx` — prompt for prep minutes on accept, reason on reject; restyle onto `Button`
- `app/(restaurant)/dashboard/page.tsx` — show `cancelReason`/`prepMinutes` on the order card (small additions)

---

## Task 1: Schema migration — availability + reject/prep fields

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add fields**

In `model User`, add after `phone`:
```prisma
  isOnline    Boolean  @default(false)
  lastLat     Float?
  lastLng     Float?
```

In `model Order`, add near the tip fields (after `etaSeconds Int?`):
```prisma
  prepMinutes  Int?
  cancelReason String?
```

- [ ] **Step 2: Create + apply migration**

Run: `npm run db:migrate -- --name batch2_rider_dispatch`
Expected: a `prisma/migrations/<ts>_batch2_rider_dispatch/` folder is created and Prisma prints "Your database is now in sync with your schema." (Retry on `P1001`. If `migrate dev` cannot reach the DB at all, run `npx prisma migrate deploy` once the DB is reachable to apply the generated migration.)

- [ ] **Step 3: Regenerate client**

Run: `npm run db:generate` → "Generated Prisma Client".

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add rider availability/position and order prep/cancel-reason"
```

---

## Task 2: `lib/dispatch.ts` — nearest-rider selection (TDD)

**Files:** Create `lib/dispatch.ts`; Test `tests/unit/dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/dispatch.test.ts
import { describe, it, expect } from "vitest";
import { selectNearestRider } from "@/lib/dispatch";

const restaurant = { lat: -1.2841, lng: 36.8233 }; // Nairobi CBD

describe("selectNearestRider", () => {
  it("returns the closest rider by great-circle distance", () => {
    const riders = [
      { id: "far", lastLat: -1.35, lastLng: 36.9 },
      { id: "near", lastLat: -1.285, lastLng: 36.824 },
      { id: "mid", lastLat: -1.3, lastLng: 36.84 },
    ];
    expect(selectNearestRider(restaurant, riders)).toBe("near");
  });

  it("ignores riders without a known position", () => {
    const riders = [
      { id: "noco", lastLat: null, lastLng: null },
      { id: "haspos", lastLat: -1.29, lastLng: 36.83 },
    ];
    expect(selectNearestRider(restaurant, riders)).toBe("haspos");
  });

  it("returns null when no rider has coordinates", () => {
    expect(
      selectNearestRider(restaurant, [
        { id: "a", lastLat: null, lastLng: null },
      ]),
    ).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(selectNearestRider(restaurant, [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`Failed to resolve import "@/lib/dispatch"`).
Run: `npx vitest run tests/unit/dispatch.test.ts`

- [ ] **Step 3: Implement `lib/dispatch.ts`**

```ts
import { haversineMeters } from "@/lib/mapbox";

export type RiderCandidate = {
  id: string;
  lastLat: number | null;
  lastLng: number | null;
};

/**
 * Pick the id of the rider nearest to `to`. Riders without a known position are
 * ignored. Returns null when no candidate has coordinates. (Caller is
 * responsible for pre-filtering to online riders.)
 */
export function selectNearestRider(
  to: { lat: number; lng: number },
  riders: RiderCandidate[],
): string | null {
  let best: { id: string; dist: number } | null = null;
  for (const r of riders) {
    if (r.lastLat == null || r.lastLng == null) continue;
    const dist = haversineMeters(to, { lat: r.lastLat, lng: r.lastLng });
    if (!best || dist < best.dist) best = { id: r.id, dist };
  }
  return best?.id ?? null;
}
```

- [ ] **Step 4: Run it — expect PASS (4 tests).**
Run: `npx vitest run tests/unit/dispatch.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/dispatch.ts tests/unit/dispatch.test.ts
git commit -m "feat(dispatch): add nearest-rider selection helper with tests"
```

---

## Task 3: Rider availability API routes

**Files:** Create `app/api/rider/status/route.ts`, `app/api/rider/location/route.ts`

- [ ] **Step 1: `PATCH /api/rider/status` (online/offline)**

```ts
// app/api/rider/status/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isOnline: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RIDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { isOnline: parsed.data.isOnline },
  });
  return NextResponse.json({ id: user.id, isOnline: user.isOnline });
}
```

- [ ] **Step 2: `PATCH /api/rider/location` (last-known position)**

```ts
// app/api/rider/location/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ lat: z.number().finite(), lng: z.number().finite() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RIDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastLat: parsed.data.lat, lastLng: parsed.data.lng },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (clean).
```bash
git add app/api/rider/status app/api/rider/location
git commit -m "feat(rider): availability + position API routes"
```

---

## Task 4: Rider availability UI + page restyle

**Files:** Create `components/RiderAvailability.tsx`; Modify `app/(rider)/rider/orders/page.tsx`

- [ ] **Step 1: `components/RiderAvailability.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { toast } from "@/lib/toast";

const PING_MS = 20_000;

export default function RiderAvailability({
  initialOnline,
}: {
  initialOnline: boolean;
}) {
  const [online, setOnline] = useState(initialOnline);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function pushLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        fetch("/api/rider/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
          }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
  }

  // While online, push position now and on an interval; stop when offline.
  useEffect(() => {
    if (!online) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      return;
    }
    pushLocation();
    timer.current = setInterval(pushLocation, PING_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function toggle() {
    setBusy(true);
    const next = !online;
    const res = await fetch("/api/rider/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: next }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not update availability");
    setOnline(next);
    toast.success(next ? "You're online" : "You're offline");
  }

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-semibold">
          Availability{" "}
          <Badge tone={online ? "success" : "neutral"}>
            {online ? "Online" : "Offline"}
          </Badge>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Go online to be auto-assigned nearby orders. We share your location
          only while you’re online.
        </p>
      </div>
      <Button variant={online ? "secondary" : "primary"} loading={busy} onClick={toggle}>
        {online ? "Go offline" : "Go online"}
      </Button>
    </Card>
  );
}
```

- [ ] **Step 2: Render it on the rider orders page + restyle the page**

Modify `app/(rider)/rider/orders/page.tsx`:
- Import `Container, PageHeader, Card, Badge` from `@/components/ui` and `RiderAvailability` from `@/components/RiderAvailability`.
- The page already loads `session`. Also load the rider's `isOnline`: after `const riderId = session!.user.id;`, add
  ```ts
  const me = await prisma.user.findUnique({ where: { id: riderId }, select: { isOnline: true } });
  ```
- Replace the outer `<div className="mx-auto max-w-3xl px-6 py-8">` with `<Container size="sm">`.
- Replace the `<h1>Deliveries</h1>` with `<PageHeader title="Deliveries" subtitle="Go online to get auto-assigned the nearest ready orders." />` and, directly under it, render `<div className="mt-6"><RiderAvailability initialOnline={me?.isOnline ?? false} /></div>`.
- Change the `OrderCard` root `<li className="rounded-xl border border-gray-200 p-4">` to `<li><Card> … </Card></li>` (keep inner JSX).
- Swap the `bg-orange-600 … hover:bg-orange-700` "Open" link classes to `bg-brand-600 … hover:bg-brand-700`.

- [ ] **Step 3: Build + commit**

Run: `npx tsc --noEmit` (clean) and `npm run build` (compiles).
```bash
git add components/RiderAvailability.tsx "app/(rider)/rider/orders/page.tsx"
git commit -m "feat(rider): online/offline toggle with position broadcast + page restyle"
```

---

## Task 5: Auto-assign nearest online rider on READY_FOR_PICKUP

**Files:** Modify `app/api/orders/[id]/status/route.ts`

- [ ] **Step 1: Import the helper**

At the top of `app/api/orders/[id]/status/route.ts`, add:
```ts
import { selectNearestRider } from "@/lib/dispatch";
```

- [ ] **Step 2: Auto-assign after the status update**

The handler currently ends with:
```ts
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: target },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
```
Insert the auto-assign block BETWEEN the `update` and the `return`:
```ts
  // When an order becomes ready and has no rider, auto-assign the nearest
  // online rider. Best-effort: if none are online it stays open for manual
  // claim (the existing /assign flow), and any failure here doesn't block the
  // status change that already succeeded.
  if (target === "READY_FOR_PICKUP" && !order.riderId) {
    try {
      const [restaurant, riders] = await Promise.all([
        prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
          select: { lat: true, lng: true },
        }),
        prisma.user.findMany({
          where: {
            role: "RIDER",
            isOnline: true,
            lastLat: { not: null },
            lastLng: { not: null },
          },
          select: { id: true, lastLat: true, lastLng: true },
        }),
      ]);
      if (restaurant) {
        const riderId = selectNearestRider(
          { lat: restaurant.lat, lng: restaurant.lng },
          riders,
        );
        if (riderId) {
          await prisma.order.update({
            where: { id: order.id },
            data: { riderId },
          });
        }
      }
    } catch {
      /* best-effort assignment; order remains claimable */
    }
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
```

- [ ] **Step 3: Typecheck + build + commit**

Run: `npx tsc --noEmit` (clean), `npm run build` (compiles).
```bash
git add "app/api/orders/[id]/status/route.ts"
git commit -m "feat(dispatch): auto-assign nearest online rider when an order is ready"
```

---

## Task 6: Accept prep-time + reject reason

**Files:** Modify `app/api/orders/[id]/status/route.ts`, `components/OrderAdvanceControls.tsx`, `app/(restaurant)/dashboard/page.tsx`

- [ ] **Step 1: Extend the status schema + persist the extras**

In `app/api/orders/[id]/status/route.ts`, replace the `StatusSchema` with:
```ts
const StatusSchema = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
  prepMinutes: z.number().int().positive().max(240).optional(),
  reason: z.string().trim().max(280).optional(),
});
```
Then change the final update to conditionally include the extras. Replace:
```ts
  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: target },
  });
```
with:
```ts
  const data: {
    status: OrderStatus;
    prepMinutes?: number;
    cancelReason?: string;
  } = { status: target };
  if (target === "ACCEPTED" && parsed.data.prepMinutes != null) {
    data.prepMinutes = parsed.data.prepMinutes;
  }
  if (target === "CANCELLED" && parsed.data.reason) {
    data.cancelReason = parsed.data.reason;
  }
  const updated = await prisma.order.update({
    where: { id: params.id },
    data,
  });
```
(The auto-assign block from Task 5 still follows this update.)

- [ ] **Step 2: Collect prep/reason in `OrderAdvanceControls.tsx`**

This client component drives both restaurant and rider advances. Update `setStatus` to send the extras, and gather them just-in-time:
- Change the `setStatus` signature to `async function setStatus(target: OrderStatus, extra?: { prepMinutes?: number; reason?: string })` and include `...extra` in the JSON body: `body: JSON.stringify({ status: target, ...extra })`.
- For the **Advance** button: when `next === "ACCEPTED"` (i.e. accepting a placed order), prompt for an optional prep estimate before sending:
  ```tsx
        onClick={() => {
          if (next === "ACCEPTED") {
            const raw = window.prompt("Estimated prep time in minutes (optional):");
            const mins = raw ? parseInt(raw, 10) : NaN;
            setStatus(next, Number.isFinite(mins) && mins > 0 ? { prepMinutes: mins } : undefined);
          } else {
            setStatus(next);
          }
        }}
  ```
- For the **Cancel** button (now the restaurant's "reject"): prompt for an optional reason:
  ```tsx
        onClick={() => {
          const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
          setStatus("CANCELLED", reason ? { reason } : undefined);
        }}
  ```
- While here, restyle the two `<button>`s onto the `Button` primitive: `import Button from "@/components/ui/Button"` and replace the advance button with `<Button size="sm" loading={busy} onClick={…}>{`Advance → ${STATUS_LABELS[next]}`}</Button>` and the cancel button with `<Button size="sm" variant="secondary" loading={busy} onClick={…}>Reject</Button>`. Keep the `error` span and the `DELIVERED`/`CANCELLED` early returns unchanged. Keep the `status:relay` socket emit in `setStatus` as-is.

- [ ] **Step 3: Surface prep/cancel info on the restaurant dashboard**

In `app/(restaurant)/dashboard/page.tsx`, the `getOrders` query returns the full order rows (so `prepMinutes`/`cancelReason` are available). In `OrderCard`, under the existing `{order.destAddress}` line, add:
```tsx
      {order.prepMinutes != null && (
        <p className="mt-1 text-xs text-gray-500">Prep estimate: {order.prepMinutes} min</p>
      )}
      {order.cancelReason && (
        <p className="mt-1 text-xs text-red-600">Rejected: {order.cancelReason}</p>
      )}
```

- [ ] **Step 4: Typecheck + build + lint + tests + commit**

Run: `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npx vitest run` — all clean/pass.
```bash
git add "app/api/orders/[id]/status/route.ts" components/OrderAdvanceControls.tsx "app/(restaurant)/dashboard/page.tsx"
git commit -m "feat(orders): prep-time on accept + reject reason, surfaced on dashboard"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full sweep**

Run each in the repo and confirm:
- `npm run build` → compiles
- `npx vitest run` → all unit tests pass (existing 25 + 4 new dispatch = 29)
- `npm run lint` → no errors
- `npm run test:e2e` → existing smoke + menu-guard specs still pass (no new e2e required this batch)

- [ ] **Step 2: Manual smoke (optional, needs the dev DB)**

With `npm run dev:all`: log in as `rider1@example.com`, toggle **Go online** (allow location). As `restaurant@example.com`, accept an order (enter a prep estimate) and advance it to **Ready for pickup** — confirm it auto-assigns to the online rider (appears under the rider's "In progress"). Toggle the rider offline and advance another order to ready — confirm it falls back to "Available to claim".

- [ ] **Step 3: (No commit needed if Step 1 is clean and everything is already committed.)**

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Task 1 = §B-batch2 schema. Task 2–3 = availability + position (§D.1). Task 4 = rider toggle UI. Task 5 = auto-assign nearest + manual-claim fallback (§D.2). Task 6 = accept prep-time + reject reason (§D.3). Task 7 = verification.
- **Deferred to Batch 3 (intentional):** stored notifications + per-user realtime push. Batch 2 surfaces assignment via the rider list on load; no socket-hub changes.
- **Manual claim still works:** the existing `POST /api/orders/[id]/assign` and the "Available to claim" list are untouched; auto-assign only fills `riderId` when an online rider exists.
- **DB is the live Supabase instance** — see the working-directory note. Retry `P1001` cold starts.
```
