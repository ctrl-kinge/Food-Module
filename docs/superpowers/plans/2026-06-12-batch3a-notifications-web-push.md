# Batch 3a — Notifications + Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A persistent in-app notification center (bell + unread badge + history) plus real VAPID web push so order events reach users even when the app is closed — wired into status changes, new orders, rider assignment, and reviews.

**Architecture:** A `Notification` row is created for the relevant user on each event via a single `createNotification` helper, which also fires a web push to that user's stored `PushSubscription`s. The bell **polls** `GET /api/notifications` (every 30s + on window focus) so no Socket.IO hub change is needed; web push covers the app-closed case. Everything degrades gracefully: with no VAPID keys, push is a no-op and the in-app center still works (the established Mapbox/Stripe fallback pattern).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind v3, Prisma v6 (Supabase), NextAuth v4, Zod, `web-push`, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-11-enhancements-design.md` (§B-batch3, §E.1, §E.2).

**Working directory:** All commands run in `c:\Users\njung\source\repos\food-delivery`. `db:migrate` hits the live Supabase DB (additive/non-destructive here; pooler cold-starts with `P1001` — retry). Do NOT push; commit onto a `feat/batch3a-notifications` branch (controller creates it before Task 1).

**Deferred to Batch 3b:** reorder, saved addresses, restaurant analytics (the polish bundle).

---

## File Structure (Batch 3a)

**Create:**
- `lib/notify-format.ts` — pure title/body builder per notification type (unit-tested)
- `lib/push.ts` — `web-push` wrapper (`PUSH_ENABLED`, `sendPushToUser`), no-key fallback
- `lib/notify.ts` — `createNotification` (insert row + push), best-effort
- `app/api/notifications/route.ts` — `GET` list + unread count
- `app/api/notifications/[id]/read/route.ts` — `PATCH` mark one read
- `app/api/notifications/read-all/route.ts` — `POST` mark all read
- `app/api/push/subscribe/route.ts` — `POST` upsert subscription
- `app/api/push/unsubscribe/route.ts` — `POST` remove subscription
- `public/sw.js` — service worker (push + notificationclick)
- `components/NotificationBell.tsx` — client bell + dropdown (polls)
- `components/PushRegistrar.tsx` — client SW registration + subscribe
- `tests/unit/notify-format.test.ts`

**Modify:**
- `prisma/schema.prisma` — `NotificationType` enum, `Notification` + `PushSubscription` models, `User` relations
- `package.json` — `web-push` dep (+ `@types/web-push`)
- `.env.example` — VAPID vars (documented)
- `components/providers.tsx` — mount `<PushRegistrar />`
- `components/CustomerHeader.tsx`, `RiderHeader.tsx`, `RestaurantHeader.tsx` — render `<NotificationBell />`
- `app/api/orders/route.ts` — notify restaurant owner on new order
- `app/api/orders/[id]/status/route.ts` — notify customer on status change; notify rider on auto-assign
- `app/api/orders/[id]/review/route.ts` — notify restaurant owner + rider on review
- `README.md` — web push setup + fallback note

---

## Task 1: Schema migration — notifications + push subscriptions

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add the enum, two models, and `User` relations**

Add at the end of the file:
```prisma
enum NotificationType {
  ORDER_STATUS
  NEW_ORDER
  ASSIGNED
  REVIEW
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  orderId   String?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, read])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}
```

In `model User`, add these relations (near `ownedRestaurant`/`reviews`):
```prisma
  notifications     Notification[]
  pushSubscriptions PushSubscription[]
```

- [ ] **Step 2: Migrate + generate**

Run: `npm run db:migrate -- --name batch3a_notifications` → "Your database is now in sync with your schema." (retry on `P1001`; or `npx prisma migrate deploy` if `migrate dev` can't reach the DB but generated the SQL).
Run: `npm run db:generate`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add Notification + PushSubscription models"
```

---

## Task 2: Add `web-push` + VAPID env scaffolding

**Files:** Modify `package.json` (via npm), `.env.example`, `.env` (local, gitignored)

- [ ] **Step 1: Install the dependency**

Run: `npm install web-push@^3.6.7` and `npm install -D @types/web-push@^3.6.4`
Expected: both appear in `package.json`; `package-lock.json` updates.

- [ ] **Step 2: Generate VAPID keys for local dev**

Run: `npx web-push generate-vapid-keys`
It prints a `Public Key:` and `Private Key:`. Copy both.

- [ ] **Step 3: Add to `.env` (local, gitignored) — append:**
```
VAPID_PUBLIC_KEY=<public key from step 2>
VAPID_PRIVATE_KEY=<private key from step 2>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key>
VAPID_SUBJECT=mailto:admin@fooddelivery.local
```

- [ ] **Step 4: Document in `.env.example` — append (placeholders, NOT real keys):**
```
# Web push (optional). Generate with: npx web-push generate-vapid-keys
# Without these, push is a no-op and the in-app notification center still works.
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

- [ ] **Step 5: Commit (note: `.env` is gitignored — only `package*.json` + `.env.example` are committed)**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add web-push dependency and VAPID env scaffolding"
```

---

## Task 3: `lib/notify-format.ts` — content per type (TDD)

**Files:** Create `lib/notify-format.ts`; Test `tests/unit/notify-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/notify-format.test.ts
import { describe, it, expect } from "vitest";
import { notificationContent } from "@/lib/notify-format";

describe("notificationContent", () => {
  it("describes an order status update for the customer", () => {
    const c = notificationContent("ORDER_STATUS", {
      orderShortId: "abc123",
      statusLabel: "En route",
    });
    expect(c.title).toBe("Order update");
    expect(c.body).toContain("abc123");
    expect(c.body).toContain("En route");
  });

  it("describes a new order for the restaurant", () => {
    const c = notificationContent("NEW_ORDER", { orderShortId: "xy" });
    expect(c.title).toBe("New order");
    expect(c.body).toContain("xy");
  });

  it("describes an assignment for the rider with restaurant name", () => {
    const c = notificationContent("ASSIGNED", {
      orderShortId: "z9",
      restaurantName: "Mama's Kitchen",
    });
    expect(c.title).toBe("New delivery");
    expect(c.body).toContain("Mama's Kitchen");
  });

  it("describes a new review", () => {
    const c = notificationContent("REVIEW", { orderShortId: "q1" });
    expect(c.title).toBe("New review");
    expect(c.body).toContain("q1");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Failed to resolve import "@/lib/notify-format"`).
Run: `npx vitest run tests/unit/notify-format.test.ts`

- [ ] **Step 3: Implement `lib/notify-format.ts`**

```ts
import type { NotificationType } from "@prisma/client";

export type NotifyContext = {
  orderShortId?: string;
  statusLabel?: string;
  restaurantName?: string;
};

/** Build the title/body shown in-app and pushed, per notification type. */
export function notificationContent(
  type: NotificationType,
  ctx: NotifyContext,
): { title: string; body: string } {
  const order = ctx.orderShortId ? `#${ctx.orderShortId}` : "your order";
  switch (type) {
    case "ORDER_STATUS":
      return {
        title: "Order update",
        body: `Order ${order} is now ${ctx.statusLabel ?? "updated"}.`,
      };
    case "NEW_ORDER":
      return { title: "New order", body: `You have a new order ${order}.` };
    case "ASSIGNED":
      return {
        title: "New delivery",
        body: `You've been assigned order ${order}${
          ctx.restaurantName ? ` from ${ctx.restaurantName}` : ""
        }.`,
      };
    case "REVIEW":
      return { title: "New review", body: `A customer reviewed order ${order}.` };
  }
}
```

- [ ] **Step 4: Run — expect PASS (4 tests).** `npx vitest run tests/unit/notify-format.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/notify-format.ts tests/unit/notify-format.test.ts
git commit -m "feat(notify): notification content builder with tests"
```

---

## Task 4: `lib/push.ts` + `lib/notify.ts`

**Files:** Create `lib/push.ts`, `lib/notify.ts`

- [ ] **Step 1: `lib/push.ts`**

```ts
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;

/** True only when both VAPID keys are configured. */
export const PUSH_ENABLED = Boolean(PUBLIC && PRIVATE);

if (PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    PUBLIC as string,
    PRIVATE as string,
  );
}

export type PushPayload = { title: string; body: string; url?: string };

/** Send a push to every subscription a user has. No-op when push is disabled.
 *  Prunes subscriptions the browser has expired (404/410). Never throws. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!PUSH_ENABLED) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        }
      }
    }),
  );
}
```

- [ ] **Step 2: `lib/notify.ts`**

```ts
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

/** Persist an in-app notification and fire a web push. Best-effort: never
 *  throws, so a failure here can't break the request that triggered it. */
export async function createNotification(args: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string;
  url?: string;
}) {
  const { userId, type, title, body, orderId, url } = args;
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, orderId },
    });
    await sendPushToUser(userId, { title, body, url });
  } catch {
    /* notifications are best-effort */
  }
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` (clean).
```bash
git add lib/push.ts lib/notify.ts
git commit -m "feat(notify): web-push sender + createNotification helper"
```

---

## Task 5: Notification API routes

**Files:** Create `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`, `app/api/notifications/read-all/route.ts`

- [ ] **Step 1: `GET /api/notifications` (list + unread count)**

```ts
// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);
  return NextResponse.json({ items, unreadCount });
}
```

- [ ] **Step 2: `PATCH /api/notifications/[id]/read`**

```ts
// app/api/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Scope to the caller so one user can't mark another's notification read.
  const res = await prisma.notification.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { read: true },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `POST /api/notifications/read-all`**

```ts
// app/api/notifications/read-all/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` (clean).
```bash
git add app/api/notifications
git commit -m "feat(notify): notification list/read API routes"
```

---

## Task 6: Push subscribe API + service worker

**Files:** Create `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts`, `public/sw.js`

- [ ] **Step 1: `POST /api/push/subscribe`**

```ts
// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;
  // Upsert by endpoint so re-subscribing (or switching users) is idempotent.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 2: `POST /api/push/unsubscribe`**

```ts
// app/api/push/unsubscribe/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `public/sw.js`**

```js
/* FoodDelivery service worker: render web pushes and focus the app on click. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = {};
  }
  const title = data.title || "FoodDelivery";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(url) && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` (clean; `public/sw.js` is not type-checked).
```bash
git add app/api/push public/sw.js
git commit -m "feat(push): subscribe/unsubscribe routes + service worker"
```

---

## Task 7: Client — NotificationBell + PushRegistrar + mount points

**Files:** Create `components/NotificationBell.tsx`, `components/PushRegistrar.tsx`; Modify `components/providers.tsx`, the three headers

- [ ] **Step 1: `components/NotificationBell.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 30_000;

export default function NotificationBell() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!authed) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore transient errors */
    }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [authed, load]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  if (!authed) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-gray-700 hover:bg-gray-100 focus-visible:outline-none"
      >
        <span aria-hidden className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-brand-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-gray-50 px-3 py-2 ${
                    n.read ? "" : "bg-brand-50"
                  }`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-600">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {new Date(n.createdAt).toLocaleString("en-US")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `components/PushRegistrar.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registers the service worker and subscribes to web push for the signed-in
 *  user. No-ops when VAPID isn't configured, push is unsupported, or the user
 *  denies permission. */
export default function PushRegistrar() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!VAPID) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;
        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID),
          }));
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
      } catch {
        /* push setup is best-effort */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
```

- [ ] **Step 3: Mount `PushRegistrar` in `components/providers.tsx`**

Add the import `import PushRegistrar from "@/components/PushRegistrar";` and render it inside `SessionProvider` (so it can read the session), next to `{children}`:
```tsx
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
        <PushRegistrar />
      </QueryClientProvider>
```

- [ ] **Step 4: Render `<NotificationBell />` in the three headers**

In `components/CustomerHeader.tsx`, `RiderHeader.tsx`, and `RestaurantHeader.tsx`, import `import NotificationBell from "@/components/NotificationBell";` and place `<NotificationBell />` inside the `<nav>` (for Customer/Rider) or the right-hand group (Restaurant), immediately before `<SignOutButton />`. Don't change other markup.

- [ ] **Step 5: Build + commit**

Run: `npx tsc --noEmit` (clean) and `npm run build` (compiles).
```bash
git add components/NotificationBell.tsx components/PushRegistrar.tsx components/providers.tsx components/CustomerHeader.tsx components/RiderHeader.tsx components/RestaurantHeader.tsx
git commit -m "feat(notify): notification bell + push registrar in headers"
```

---

## Task 8: Wire notification triggers

**Files:** Modify `app/api/orders/route.ts`, `app/api/orders/[id]/status/route.ts`, `app/api/orders/[id]/review/route.ts`

- [ ] **Step 1: New order → restaurant owner** (`app/api/orders/route.ts`)

The route already fetches `restaurant` for the `isOpen` check. Change that lookup's `select` to also return `ownerId` and `name`:
```ts
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isOpen: true, ownerId: true, name: true },
  });
```
Then, after the order is created (`const order = await prisma.order.create(...)`) and before the `return`, add:
```ts
  if (restaurant.ownerId) {
    const { notificationContent } = await import("@/lib/notify-format");
    const { createNotification } = await import("@/lib/notify");
    const c = notificationContent("NEW_ORDER", { orderShortId: order.id.slice(-6) });
    await createNotification({
      userId: restaurant.ownerId,
      type: "NEW_ORDER",
      title: c.title,
      body: c.body,
      orderId: order.id,
      url: "/dashboard",
    });
  }
```
(Dynamic `import()` keeps this self-contained; `createNotification` is best-effort and won't throw.)

- [ ] **Step 2: Status change → customer; auto-assign → rider** (`app/api/orders/[id]/status/route.ts`)

Add two static imports at the top, and add `STATUS_LABELS` to the EXISTING `@/lib/order-status` import (currently `import { NEXT_STATUS, canCancel, ALL_STATUSES } from "@/lib/order-status";` → make it `import { NEXT_STATUS, canCancel, ALL_STATUSES, STATUS_LABELS } from "@/lib/order-status";`):
```ts
import { createNotification } from "@/lib/notify";
import { notificationContent } from "@/lib/notify-format";
```
Immediately after the status-update statement (the `const updated = await prisma.order.update(...)` that ends the Batch-2 `data` block) and BEFORE the `// When an order becomes ready` auto-assign block, notify the customer (the bare `{ }` block scopes `c` so it can't collide with the auto-assign block's `c`):
```ts
  {
    const c = notificationContent("ORDER_STATUS", {
      orderShortId: order.id.slice(-6),
      statusLabel: STATUS_LABELS[target],
    });
    await createNotification({
      userId: order.customerId,
      type: "ORDER_STATUS",
      title: c.title,
      body: c.body,
      orderId: order.id,
      url: `/orders/${order.id}`,
    });
  }
```
Inside the auto-assign block, right after `await prisma.order.update({ where: { id: order.id }, data: { riderId } });`, add:
```ts
          const c = notificationContent("ASSIGNED", {
            orderShortId: order.id.slice(-6),
          });
          await createNotification({
            userId: riderId,
            type: "ASSIGNED",
            title: c.title,
            body: c.body,
            orderId: order.id,
            url: `/rider/orders/${order.id}`,
          });
```
(The restaurant name isn't selected in that query; leaving `restaurantName` undefined yields a clean "You've been assigned order #xxxxxx." message. Keep it simple.)

- [ ] **Step 3: Review → restaurant owner + rider** (`app/api/orders/[id]/review/route.ts`)

The route loads `order` (with `review`) and has `order.restaurantId` and `order.riderId`. After the `$transaction` completes and before the `return`, add:
```ts
  {
    const { notificationContent } = await import("@/lib/notify-format");
    const { createNotification } = await import("@/lib/notify");
    const c = notificationContent("REVIEW", { orderShortId: order.id.slice(-6) });
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { ownerId: true },
    });
    if (restaurant?.ownerId) {
      await createNotification({
        userId: restaurant.ownerId,
        type: "REVIEW",
        title: c.title,
        body: c.body,
        orderId: order.id,
        url: "/dashboard",
      });
    }
    if (order.riderId) {
      await createNotification({
        userId: order.riderId,
        type: "REVIEW",
        title: c.title,
        body: c.body,
        orderId: order.id,
      });
    }
  }
```

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit` (clean), `npm run build` (compiles).
```bash
git add app/api/orders/route.ts "app/api/orders/[id]/status/route.ts" "app/api/orders/[id]/review/route.ts"
git commit -m "feat(notify): create notifications on new order, status change, assignment, review"
```

---

## Task 9: Docs + final verification

**Files:** Modify `README.md`

- [ ] **Step 1: README — add a "Web push" subsection** under the existing maps/tips note, documenting:
  - Generate keys: `npx web-push generate-vapid-keys`.
  - Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` in `.env` (local) and in the Vercel project (prod).
  - Without them, push is a no-op and the in-app notification bell still works.
  - iOS Safari only delivers web push to an installed PWA.

- [ ] **Step 2: Full sweep**

Run:
- `npm run build` → compiles
- `npx vitest run` → all pass (29 existing + 4 notify-format = 33)
- `npm run lint` → no errors
- `npm run test:e2e` → existing specs still pass

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: web push setup and fallback note"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Task 1 = §B-batch3 schema. Tasks 3–4 = content + push/notify helpers. Task 5 = notification center API (§E.1). Task 6 = web push transport + SW (§E.2). Task 7 = bell + registrar UI (§E.1/E.2). Task 8 = triggers (new order, status, assignment, review). Task 9 = docs + verification.
- **Bell uses polling, not a socket room** — deliberate, so the Render hub needs no change. Web push covers app-closed delivery. (Spec mentioned a per-user socket room; polling is the simpler equivalent and is noted here as the chosen approach.)
- **No-key fallback:** `PUSH_ENABLED` gates all sending; with no VAPID env, push silently no-ops and the in-app center is fully functional. CI builds without keys.
- **Best-effort:** `createNotification` never throws, so notification/push failures can't break order placement, status changes, or reviews.
- **Security:** notification read routes scope by `userId`; subscribe stores under the caller's id; `GET` returns only the caller's rows.
- **DB is the live Supabase instance** — additive migration; retry `P1001` cold starts.
- **Deferred to Batch 3b:** reorder, saved addresses, restaurant analytics.
```
