# FoodDelivery

A food delivery web app with three roles (Customer / Rider / Restaurant), live
traffic-aware rider tracking, and separate tips for riders and restaurants.

Built phase by phase from [`FOOD_DELIVERY_ROADMAP.md`](./FOOD_DELIVERY_ROADMAP.md).
**Current status: Phase 0 (scaffold).**

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
cp .env.example .env   # then fill in values as needed (all optional for Phase 0)
npm run dev
```

Open http://localhost:3000.

The app runs without any API keys in Phase 0. Mapbox/Stripe/DB are wired in
later phases and each has a documented no-key fallback so the app still runs
locally.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run socket` | Start the Socket.IO server (skeleton until Phase 3) |

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
