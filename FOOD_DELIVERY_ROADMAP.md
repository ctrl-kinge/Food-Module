# Food Delivery WebApp — Build Roadmap & Spec

> **How to use this file with Claude Code (VS Code extension):**
> Place this file at the root of an empty project folder. Open Claude Code and say:
> *"Read `FOOD_DELIVERY_ROADMAP.md` and implement Phase 0, then stop. Wait for me to confirm before each subsequent phase."*
> Build phase by phase. Do not let it generate the whole app in one shot — review, run, and test after each phase.

---

## 0. What we're building

A food delivery web application with three roles:

1. **Customer** — browses restaurants, orders food, tracks the rider live on a map with a traffic-aware ETA, and after delivery leaves a rating/review + tips the rider and the restaurant separately.
2. **Rider (courier)** — sees assigned orders, the customer's delivery location, and the pickup restaurant; broadcasts their live GPS position.
3. **Restaurant** — receives orders, marks them prepared/handed-off (lightweight, can be a stub in v1).

The four hard requirements:
- [R1] Customer can place an order from a restaurant.
- [R2] After ordering, the customer sees **live tracking** of the food with a **real-time, traffic-aware ETA**.
- [R3] The rider sees the customer's delivery location relative to the pickup point.
- [R4] The customer can see **ratings & reviews** and leave a **tip for the rider** and a separate **tip/rating for the restaurant**.

---

## 1. Tech stack (use exactly this unless I say otherwise)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | One repo, API routes + UI, easy deploy |
| Styling | **Tailwind CSS** + shadcn/ui | Fast, consistent |
| DB / ORM | **PostgreSQL + Prisma** | Relational data, geo queries via lat/lng |
| Realtime | **Socket.IO** (custom Node server) OR **Supabase Realtime** | Live rider position + order status |
| Auth | **NextAuth (Auth.js)** with credentials + roles | Customer / Rider / Restaurant roles |
| Maps & routing | **Mapbox GL JS** + **Mapbox Directions API** (traffic profile) | Map rendering + traffic-aware ETA |
| Payments / tips | **Stripe** (test mode) | Tips for rider + restaurant |
| State (client) | React Query (server state) + Zustand (UI state) | Clean separation |
| Deploy | Vercel (web) + Railway/Render (socket server + Postgres) | |

> **ETA note:** The "traffic-aware" ETA comes from Mapbox Directions API using the `driving-traffic` profile, recomputed every time the rider's position updates (throttled to ~every 10-15s). If no Mapbox key is available, fall back to a Haversine distance / assumed speed estimate and label it clearly as "estimate (no live traffic)".

> **Build decisions for this repo:** Realtime = **Socket.IO** (custom Node server). Phases are built one at a time with a stop after each. Note: `create-next-app@latest` now installs Next 16, so this project pins **Next.js 14** explicitly to match the patterns below.

---

## 2. Data model (Prisma schema — implement in Phase 1)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(CUSTOMER)
  phone     String?
  orders    Order[]  @relation("CustomerOrders")
  riderOrders Order[] @relation("RiderOrders")
  reviews   Review[]
  createdAt DateTime @default(now())
}

enum Role { CUSTOMER RIDER RESTAURANT ADMIN }

model Restaurant {
  id        String   @id @default(cuid())
  name      String
  lat       Float
  lng       Float
  address   String
  imageUrl  String?
  menu      MenuItem[]
  orders    Order[]
  reviews   Review[]
  avgRating Float    @default(0)
}

model MenuItem {
  id           String   @id @default(cuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  name         String
  description  String?
  priceCents   Int
  imageUrl     String?
  available    Boolean  @default(true)
}

model Order {
  id            String      @id @default(cuid())
  customerId    String
  customer      User        @relation("CustomerOrders", fields: [customerId], references: [id])
  riderId       String?
  rider         User?       @relation("RiderOrders", fields: [riderId], references: [id])
  restaurantId  String
  restaurant    Restaurant  @relation(fields: [restaurantId], references: [id])
  items         OrderItem[]
  status        OrderStatus @default(PLACED)
  // delivery destination
  destLat       Float
  destLng       Float
  destAddress   String
  // live rider position (updated in realtime)
  riderLat      Float?
  riderLng      Float?
  etaSeconds    Int?
  subtotalCents Int
  riderTipCents Int        @default(0)
  restaurantTipCents Int   @default(0)
  review        Review?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

enum OrderStatus { PLACED ACCEPTED PREPARING READY_FOR_PICKUP PICKED_UP EN_ROUTE DELIVERED CANCELLED }

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  menuItemId String
  name      String   // snapshot
  priceCents Int     // snapshot
  qty       Int
}

model Review {
  id            String   @id @default(cuid())
  orderId       String   @unique
  order         Order    @relation(fields: [orderId], references: [id])
  customerId    String
  customer      User     @relation(fields: [customerId], references: [id])
  restaurantId  String
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id])
  restaurantRating Int   // 1-5
  riderRating   Int       // 1-5
  comment       String?
  createdAt     DateTime @default(now())
}
```

---

## 3. The order/tracking lifecycle (state machine)

```
PLACED --> ACCEPTED --> PREPARING --> READY_FOR_PICKUP --> PICKED_UP --> EN_ROUTE --> DELIVERED
   |                                                                                      |
   +------------------------- CANCELLED (before PICKED_UP) -----------------+             +--> review + tips unlocked
```

- Status transitions are pushed over the realtime channel so the customer's tracking page updates instantly.
- Rider GPS pings (`riderLat`/`riderLng`) flow `EN_ROUTE` -> recompute ETA -> broadcast to the customer's order room.
- Review/tip UI is only enabled once status === `DELIVERED`.

---

## 4. Realtime channel contract

Use a room per order: `order:{orderId}`.

| Event | Direction | Payload |
|---|---|---|
| `rider:location` | rider -> server -> customer | `{ orderId, lat, lng, ts }` |
| `order:eta` | server -> customer | `{ orderId, etaSeconds, distanceMeters }` |
| `order:status` | server -> customer & rider | `{ orderId, status }` |
| `order:assigned` | server -> rider | `{ orderId, restaurant, dest }` |

Rider app emits `rider:location` from `navigator.geolocation.watchPosition`, throttled. Server recomputes ETA via Mapbox Directions (`driving-traffic`) from rider -> destination, then emits `order:eta`.

---

## 5. Build phases (Claude Code: do ONE per turn, stop and wait)

### Phase 0 — Scaffold
- `npx create-next-app@latest` (TS, App Router, Tailwind, ESLint).
- Install deps: `prisma @prisma/client next-auth @tanstack/react-query zustand socket.io socket.io-client mapbox-gl stripe zod`.
- Set up `.env.example` with: `DATABASE_URL`, `NEXTAUTH_SECRET`, `MAPBOX_TOKEN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `SOCKET_URL`.
- Folder structure:
  ```
  /app
    /(auth)/login, /register
    /(customer)/restaurants, /restaurants/[id], /orders/[id]   -> tracking page
    /(rider)/rider/orders, /rider/orders/[id]
    /(restaurant)/dashboard
    /api/...
  /lib (prisma, auth, mapbox, socket-client, stripe)
  /components
  /server (socket.io server entry: server.ts)
  /prisma/schema.prisma
  ```
- **Deliverable:** app boots, Tailwind works, empty routed pages render. STOP.

### Phase 1 — Data + Auth
- Add the Prisma schema from §2, run `prisma migrate dev`.
- Seed script: 3 restaurants with menus, 1 customer, 2 riders.
- NextAuth credentials provider with role on the session/JWT.
- Route guards: customer pages, rider pages, restaurant pages by role.
- **Deliverable:** can register/login as each role; seed data visible. STOP.

### Phase 2 — Browsing + Ordering [R1]
- `/restaurants` list (cards, avg rating shown).
- `/restaurants/[id]` menu + cart (Zustand cart store).
- Checkout: choose delivery address (Mapbox geocoder pin), create `Order` (status `PLACED`), snapshot items.
- **Deliverable:** a customer can place a real order persisted in DB. STOP.

### Phase 3 — Realtime server + status
- Build `server/server.ts` Socket.IO server (rooms per order, events from §4).
- Restaurant dashboard: list incoming orders, buttons to advance status.
- Customer order page subscribes and shows current status as a stepper.
- **Deliverable:** restaurant advances status -> customer sees it live. STOP.

### Phase 4 — Live tracking + traffic ETA [R2][R3]
- Rider app `/rider/orders/[id]`: map showing **restaurant (pickup)** and **customer (destination)** + route line. This satisfies [R3].
- Rider emits `watchPosition` -> `rider:location` (throttled ~10s).
- Server recomputes ETA via Mapbox Directions `driving-traffic`, emits `order:eta`.
- Customer `/orders/[id]`: live map with moving rider marker, ETA countdown, distance, traffic-aware. This satisfies [R2].
- Fallback ETA (Haversine) when no Mapbox token, clearly labeled.
- **Deliverable:** rider moves -> customer sees marker move + ETA update. STOP.

### Phase 5 — Reviews + tips [R4]
- After `DELIVERED`: unlock a panel on `/orders/[id]`.
- Separate controls: **rider rating (1-5)**, **restaurant rating (1-5)**, optional comment.
- **Rider tip** and **restaurant tip** as separate amounts -> Stripe PaymentIntent (test mode); store `riderTipCents` / `restaurantTipCents`.
- Recompute restaurant `avgRating` on new review.
- Restaurant page shows aggregated ratings & recent reviews.
- **Deliverable:** all of [R4] working end to end. STOP.

### Phase 6 — Polish
- Loading/empty/error states, mobile responsive, reduced-motion, keyboard focus.
- Reconnect handling for sockets; optimistic cart; toast notifications.
- README with run instructions + how to demo the full flow.

---

## 6. Acceptance test (the demo script)

1. Login as customer -> order from "Restaurant A".
2. Login as restaurant (2nd browser) -> accept -> mark READY_FOR_PICKUP.
3. Login as rider (3rd browser/phone) -> see pickup + customer dest on map -> mark PICKED_UP/EN_ROUTE -> move around.
4. Customer's page: rider marker moves, ETA changes with traffic, status updates live.
5. Rider marks DELIVERED -> customer rates rider + restaurant, tips both (Stripe test card `4242...`).
6. Restaurant page now shows updated avg rating + the new review.

If all 6 pass, R1-R4 are satisfied.

---

## 7. Guardrails for Claude Code (paste these as standing rules)

- Work **one phase per turn**; after each, summarize what changed and how to run/test it, then stop.
- Never commit real secrets; only edit `.env.example`.
- Keep components small; colocate types; validate all API input with `zod`.
- Write the Prisma schema once (Phase 1) and migrate; don't redefine models ad hoc.
- For anything needing a paid API (Mapbox/Stripe), always implement a documented no-key fallback so the app runs locally without keys.
- Prefer server components; use client components only where interactivity/maps/sockets require it.
- After Phase 4 and Phase 5, run the relevant steps of the §6 acceptance test and report results.
