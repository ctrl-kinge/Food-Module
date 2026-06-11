# FoodDelivery

A food delivery web app with three roles (Customer / Rider / Restaurant), live
traffic-aware rider tracking, and separate tips for riders and restaurants.

Built phase by phase from [`FOOD_DELIVERY_ROADMAP.md`](./FOOD_DELIVERY_ROADMAP.md).
**Current status: Phase 5 — all four requirements (R1–R4) complete.** (Phase 6
is optional polish.)

> Maps & ETA work without any keys: set `MAPBOX_TOKEN` +
> `NEXT_PUBLIC_MAPBOX_TOKEN` for a real map and traffic-aware ETA, otherwise the
> app shows an SVG relative-position map and a Haversine straight-line ETA
> labelled "estimate (no live traffic)". Tips work without Stripe too: set
> `STRIPE_SECRET_KEY` to charge test-mode PaymentIntents, otherwise tips are
> recorded as "simulated".

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v3
- PostgreSQL + Prisma (Phase 1)
- Socket.IO for realtime (Phase 3+)
- NextAuth (Auth.js v4) for auth + roles (Phase 1)
- Mapbox GL + Directions API for maps and traffic-aware ETA, with a Haversine
  fallback when no token is set (Phase 4)
- Stripe (test mode) for tips (Phase 5)

## Getting started

```bash
npm install
cp .env.example .env   # set DATABASE_URL + DIRECT_URL (Supabase) and NEXTAUTH_SECRET
npm run db:migrate     # apply schema to your DB
npm run db:seed        # demo restaurants + users
npm run dev:all        # runs the web app AND the Socket.IO server together
```

Open http://localhost:3000.

- `npm run dev:all` starts Next (port 3000) and the realtime hub (port 4000)
  together. You can also run them separately: `npm run dev` + `npm run socket`.
- Mapbox/Stripe are wired in later phases and each has a documented no-key
  fallback. If the socket server isn't running, order status still works — it
  just updates on refresh instead of live.

### Demo accounts (after seeding, password `password123`)

| Email | Role |
|---|---|
| `customer@example.com` | Customer |
| `rider1@example.com` / `rider2@example.com` | Rider |
| `restaurant@example.com` | Restaurant |

To see live status: open `/orders/[id]` as the customer in one browser and
`/dashboard` as the restaurant in another; advancing status on the dashboard
updates the customer's tracker instantly.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (http://localhost:3000) |
| `npm run dev:all` | Start the web app + Socket.IO hub together |
| `npm run socket` | Start only the Socket.IO realtime hub (http://localhost:4000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma migrate / seed / Studio |
| `npm run test` / `test:run` | Vitest unit tests (watch / once) |
| `npm run test:e2e` | Playwright smoke tests (boots a dev server) |

## Testing

- **Unit (Vitest, jsdom):** cart store, order-status state machine, ETA/Haversine
  math, and formatters — `npm run test:run`.
- **End-to-end (Playwright):** a smoke spec for the landing page, public login,
  the customer route guard, and the health endpoint — `npm run test:e2e`
  (first run: `npx playwright install chromium`).
- **CI:** [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs the build
  (lint + typecheck), unit tests, and the Playwright smoke on every push/PR.

## Routes (Phase 0 placeholders)

| Route | Role | Phase |
|---|---|---|
| `/` | — | landing |
| `/login`, `/register` | all | 1 |
| `/restaurants`, `/restaurants/[id]` | customer | 2 |
| `/orders/[id]` | customer | 3-5 (tracking + reviews) |
| `/rider/orders`, `/rider/orders/[id]` | rider | 4 |
| `/dashboard` | restaurant | 3 |
| `/api/health` | — | liveness check |

## Project layout

```
app/                 # App Router pages (route groups by role) + /api
components/          # Shared UI components
lib/                 # prisma, auth, mapbox, socket-client, stripe helpers
server/server.ts     # Standalone Socket.IO server
prisma/schema.prisma # Data model (generator + datasource now; models in Phase 1)
```

## Roadmap

See [`FOOD_DELIVERY_ROADMAP.md`](./FOOD_DELIVERY_ROADMAP.md) for the full spec,
data model, realtime contract, build phases, and acceptance test.
