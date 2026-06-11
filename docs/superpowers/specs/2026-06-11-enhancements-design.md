# FoodDelivery — Enhancements Design (2026-06-11)

Status: **approved design**, pending spec review → implementation plan.

This spec adds five capability areas on top of the completed Phase 1–6 app
(requirements R1–R4 already shipped and deployed). Work is delivered in **three
reviewable batches** so the user can check in between. Each batch carries its own
Prisma migration to keep diffs small.

The guiding constraints from the existing project still hold:

- **No-key fallbacks everywhere** — Mapbox, Stripe, and now Web Push must all
  degrade gracefully when their env vars are absent. A missing key never breaks
  a page; the feature falls back to a sensible offline behaviour.
- **Light-only theme** (per the note in `app/globals.css`). Accessibility is
  delivered through contrast, keyboard support, and ARIA — not a dark theme.
- **Follow existing patterns**: Next.js 14 App Router, route groups by role,
  Server Components for data, Zod for validation, Prisma for data access,
  Socket.IO hub for realtime, force-dynamic pages (no DB at build time).

---

## A. Cross-cutting: design system + accessibility

Goal: make the app visually cohesive and "presentable" without a rewrite, and
raise the accessibility floor across every screen. Direction chosen:
**warm & refined** — keep the orange/amber brand, elevate execution.

### A.1 UI primitives (`components/ui/`)

A small, focused primitive set. Each is a single-purpose component with a clear
prop interface so screens compose rather than re-style:

- `Button` — variants `primary | secondary | ghost | danger`; sizes `sm | md`;
  `loading` (shows `Spinner`, sets `aria-busy`) and `disabled` states; renders a
  real `<button>` or, via `asChild`/`as="a"`, a styled `Link`.
- `Card` — padded, rounded-xl, soft shadow, optional hover affordance.
- `Badge` — status/label chip; tone prop maps to AA-contrast colour pairs.
- `Container` — centered `max-w-*` + responsive horizontal padding (replaces the
  repeated `mx-auto max-w-… px-6` pattern).
- `PageHeader` — title + optional subtitle + right-aligned actions slot.
- `Field` / `Input` / `Textarea` / `Label` — label always associated via `id`;
  error text wired with `aria-describedby` and `aria-invalid`.
- `Spinner` — accessible busy indicator (`role="status"`, visually-hidden text).
- `EmptyState` — icon + message + optional action, for empty lists.

### A.2 Theme

- Extend `tailwind.config.ts` with a `brand` colour scale (mapped to the
  existing orange) and keep semantic `background`/`foreground` tokens.
- **Apply the Geist font**: `app/globals.css` currently overrides `body` to
  Arial, which defeats the Geist variables already loaded in `app/layout.tsx`.
  Change `body` font-family to `var(--font-geist-sans)` and reserve
  `var(--font-geist-mono)` for numeric/code contexts.
- Soft shadows, rounded cards, generous spacing as the default look.

### A.3 Accessibility baseline

- Skip-to-content link as the first focusable element in the root layout.
- Semantic landmarks: each role layout wraps content in `<main>`; headers use
  `<header>`/`<nav>`.
- WCAG **AA** contrast for all text and interactive elements (verify the orange
  button/text pairs; darken where needed).
- Toast region gets `aria-live="polite"` so status changes are announced.
- Icon-only controls (bell, qty +/−, toggles) get `aria-label`s.
- Preserve existing `:focus-visible` ring and `prefers-reduced-motion` handling.

### A.4 Refactor existing screens onto primitives

Restyle (no behaviour change): `RestaurantCard`, `MenuList`, the three role
headers, `app/(auth)/login` + `register`, `checkout`, the restaurant
`dashboard`, and customer `orders` list/detail. This is the visible polish.

---

## B. Schema changes (spine)

All additive; three migrations (one per batch). Field-level summary:

**Batch 1 migration**

- `Restaurant`: `+ ownerId String? @unique`, `+ owner User? @relation("RestaurantOwner", fields: [ownerId], references: [id])`, `+ isOpen Boolean @default(true)`
- `MenuItem`: `+ category String?`
- `User`: `+ ownedRestaurant Restaurant? @relation("RestaurantOwner")`

> **Key structural change.** Today a `RESTAURANT` user is not linked to any
> `Restaurant` row, so menu CRUD has nothing to scope to. `ownerId` establishes
> that ownership. The seed is updated to connect the seeded restaurant user to
> its restaurant.

**Batch 2 migration**

- `User`: `+ isOnline Boolean @default(false)`, `+ lastLat Float?`, `+ lastLng Float?`
- `Order`: `+ prepMinutes Int?`, `+ cancelReason String?`

**Batch 3 migration**

- `User`: `+ addresses Address[]`, `+ notifications Notification[]`, `+ pushSubscriptions PushSubscription[]`
- New `Address` — `id`, `userId`, `label` (e.g. "Home"), `address`, `lat`, `lng`,
  `isDefault Boolean @default(false)`, `createdAt`.
- New `Notification` — `id`, `userId`, `orderId String?`, `type` (enum
  `NotificationType`), `title`, `body`, `read Boolean @default(false)`,
  `createdAt`. Indexed on `(userId, read)`.
- New `PushSubscription` — `id`, `userId`, `endpoint String @unique`, `p256dh`,
  `auth`, `createdAt`.

---

## C. Batch 1 — Visual refresh + restaurant menu CRUD

### C.1 Scope

1. Land the design system (section A) and refactor existing screens onto it.
2. Restaurant menu management + open/closed toggle.

### C.2 Menu management

- New page `app/(restaurant)/dashboard/menu/page.tsx` — lists the owner's items
  grouped by category, with add/edit/delete and an `available` toggle per item,
  plus a restaurant-level **Open / Closed** switch.
- The restaurant is resolved from `session.user.id` via `Restaurant.ownerId`.
- API (all guarded to `RESTAURANT` role **and** ownership, Zod-validated):
  - `POST   /api/menu` — create item `{ name, description?, priceCents, category?, available }`
  - `PATCH  /api/menu/[id]` — update fields
  - `DELETE /api/menu/[id]` — remove item
  - `PATCH  /api/restaurant` — `{ isOpen }` (extensible to name/address later)
- Customer side: a **Closed** badge on `RestaurantCard` and the restaurant page;
  ordering is blocked (Add buttons disabled + server-side guard in the create-
  order route) when `isOpen === false`.

### C.3 Seed

Connect the seeded `restaurant@example.com` user to its `Restaurant` via
`ownerId` so menu CRUD works out of the box for the demo account.

---

## D. Batch 2 — Rider dispatch

### D.1 Availability

- Rider **Online/Offline** toggle in the rider header / `/rider/orders`.
- `PATCH /api/rider/status` — `{ isOnline }` (RIDER-guarded).
- While online, the existing geolocation broadcaster also persists the rider's
  `lastLat/lastLng` via `PATCH /api/rider/location` (throttled). Going offline
  clears nothing but stops broadcasting.

### D.2 Auto-assign nearest + claim fallback

- In the order **status route**, when an order transitions to
  `READY_FOR_PICKUP` and has no `riderId`:
  - Select the nearest **online** rider by Haversine distance (reuse
    `haversineMeters` from `lib/mapbox.ts`) from the rider's `lastLat/lastLng`
    to the restaurant location.
  - Assign (`riderId`), emit realtime + create a `Notification` for that rider.
  - If **no** rider is online, leave it unassigned — the existing manual
    **claim** flow (`POST /api/orders/[id]/assign`) remains as the fallback, now
    shown only to online riders.
- Pure helper `selectNearestRider(restaurant, riders)` in `lib/dispatch.ts`
  (unit-tested).

### D.3 Restaurant accept / reject

- Accept already exists (`PLACED → ACCEPTED` via `OrderAdvanceControls`); add an
  optional prep-time estimate captured at accept and stored on
  `Order.prepMinutes` (feeds ETA display).
- Add a **Reject** action for pre-pickup orders → `CANCELLED` with
  `cancelReason`. Reuses `canCancel()` and the existing status route's cancel
  path; customer is notified.

---

## E. Batch 3 — Notifications + polish bundle

### E.1 Notification center

- Bell icon + unread-count badge in all role headers. Clicking opens a
  **dropdown panel** showing the most recent items with per-item **mark-read**
  and a **mark-all-read** action; a "See all" link goes to a full
  `/notifications` page with the complete history.
- `Notification` rows are created server-side on: new order (→ restaurant),
  status change (→ customer), assignment (→ rider), review received
  (→ restaurant/rider).
- API: `GET /api/notifications`, `PATCH /api/notifications/[id]/read`,
  `POST /api/notifications/read-all`.
- Realtime nudge: add a per-user room `user:{userId}` to the Socket.IO hub; the
  bell refreshes its unread count when the server emits to that room. Falls back
  to refresh-on-focus when the socket is offline.

### E.2 Web push (VAPID)

- `public/sw.js` service worker handling `push` (show notification) and
  `notificationclick` (focus/open the relevant order URL).
- Client registers the SW and subscribes with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`;
  the subscription is POSTed to `POST /api/push/subscribe` (and removed on
  unsubscribe / 410 Gone).
- Server helper `lib/push.ts` wraps the `web-push` library with VAPID keys from
  env and sends to a user's subscriptions whenever a `Notification` is created.
- **No-key fallback**: if `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are unset,
  `lib/push.ts` is a no-op and only the in-app center is used — matching the
  Mapbox/Stripe fallback pattern. Stale subscriptions (HTTP 410) are pruned.
- Known limitation (documented in README): iOS Safari only delivers web push to
  an **installed PWA**; the in-app center covers that gap.

### E.3 Polish bundle

- **Order again**: a button on order history / detail that rebuilds the cart
  from a past order's `OrderItem`s (via `useCart.startNewCart`), guarded so it
  only includes items that still exist and are `available`, and respects the
  single-restaurant cart lock. Pure helper unit-tested.
- **Saved addresses**: `Address` CRUD (`/api/addresses` + a manage view in the
  customer profile/checkout). The `AddressPicker` lists saved addresses with a
  default, plus a "save this address" affordance after geocoding.
- **Restaurant analytics**: `app/(restaurant)/dashboard/analytics/page.tsx` —
  orders/day and revenue over the last 14–30 days, top items, average rating,
  and average prep/delivery time. Server-side Prisma aggregations
  (`groupBy`/`aggregate`) feeding a **dependency-free SVG bar chart** component.
  Aggregation logic lives in pure helpers (`lib/analytics.ts`, unit-tested).

---

## F. Testing, environment, deployment

### F.1 Tests

- **Unit (Vitest)** — new pure-function suites:
  - `selectNearestRider` (nearest online rider, ties, none-online)
  - menu create/update Zod schema (valid/invalid)
  - reorder cart-rebuild (filters unavailable, respects restaurant lock)
  - analytics aggregation (bucketing, totals, top items)
  - notification title/body formatting per `NotificationType`
- **E2E (Playwright)** — extend the smoke spec: restaurant menu route is guarded
  for non-restaurant users; the notification bell renders for an authed user.
- CI (`.github/workflows/ci.yml`) stays green; dummy env already covers build.

### F.2 Environment

New variables (all optional, documented in `.env.example` + README with the
fallback behaviour):

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — server (self-generated via
  `npx web-push generate-vapid-keys`; no account needed).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — client (same public key).

New dependency: `web-push` (+ `@types/web-push`).

### F.3 Deployment

- Each batch's migration is applied to Supabase with `prisma migrate deploy`
  (direct connection / `DIRECT_URL`).
- Service worker is served statically from `/public`; no Vercel config change.
- Socket hub gains the `user:{id}` room handler — a small, backward-compatible
  addition deployed to Render.
- VAPID env vars added to Vercel (web) project settings.

---

## G. Build order (summary)

1. **Batch 1** — design system + a11y + menu CRUD (migration 1).
2. **Batch 2** — rider online/offline + auto-assign + accept/reject (migration 2).
3. **Batch 3** — notification center + web push + polish bundle (migration 3).

Each batch ends in a self-contained, separately-reviewable commit with passing
tests, mirroring the phase-by-phase rhythm of the original build.
