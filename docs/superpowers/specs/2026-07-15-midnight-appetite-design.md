# Food-Delivery "Midnight Appetite" UI Revamp — Design

**Date:** 2026-07-15
**Status:** Approved (direction A chosen via visual companion; dark everywhere)

## Goal

Replace the stock Tailwind-orange template look with a premium dark identity
across all three surfaces. Presentation only — no route, form, API, or
database changes.

## Identity — Midnight Appetite

- **Canvas:** deep charcoal `#131210`; elevated surfaces `#1d1b18` /
  `#26231f`; hairline borders `#2e2a24`.
- **Text:** warm off-white `#f5f1e8`; secondary `#b3ac9e`; muted `#8a857a`.
- **Accent:** saffron gold `#e8b04b` (hover `#f0c06a`, deep `#c99333`) —
  CTAs, ratings, active states. Single accent; green `#6fbf8f` / red
  `#e06c5a` reserved for order-status semantics.
- **Cards:** image-led, rounded (10–14px), 1px inner borders, deep
  food-toned gradient placeholders where photos are missing.
- **Type:** tight heavy sans for headings (negative tracking), no serif —
  deliberately opposite to KhetiaIS's editorial look.

## Architecture

Tailwind token swap: replace the `brand` orange scale in
`tailwind.config.ts` with the saffron scale plus `surface` and `ink` token
groups; dark canvas via CSS vars in `globals.css`. Components already use
`brand-*` classes, so recoloring is largely config-level with per-component
passes for backgrounds/text.

## Phases

1. **Tokens + customer surface (this phase):** config, globals, restaurants
   list, restaurant detail, checkout, orders list + tracking, and landing
   page harmonization (restyled June 2026, must not clash at the auth
   boundary). Auth pages included.
2. **Restaurant dashboard:** denser data variant, dark chart styling.
3. **Rider surface:** big-touch-target dark UI, Mapbox dark style.

## Hard constraints

1. **Never touch the database.** No `db:seed`, no `prisma migrate` — dev
   and prod share one Supabase database.
2. No behavior changes: routes, forms, API calls, socket events, Stripe and
   Mapbox flows untouched.
3. `vitest run` green before merge. **Playwright e2e is NOT run** — it
   creates orders and would write to the shared production DB. Visual
   verification via read-only dev-server browsing + screenshots.
