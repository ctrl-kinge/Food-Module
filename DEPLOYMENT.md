# Deployment

Three pieces:

| Piece | Host | Why |
|---|---|---|
| Web app (Next.js) | **Vercel** | Serverless-friendly; auto-builds Next |
| Realtime hub (Socket.IO) | **Render** (or Railway) | Long-running stateful process — can't run on Vercel serverless |
| Database (PostgreSQL) | **Supabase** | Already provisioned and migrated |

They reference each other's URLs, so deploy in this order: **socket → web → wire the URLs back**.

> No Mapbox or Stripe keys are required. Without them the app uses its built-in
> fallbacks (SVG map + Haversine ETA; tips recorded as "simulated").

---

## 0. Push the repo to GitHub

Both hosts deploy from GitHub. Create an **empty** repo (no README) at
github.com, then from `food-delivery/`:

```bash
git remote add origin https://github.com/<you>/food-delivery.git
git push -u origin master
```

## 1. Socket hub → Render

1. Render dashboard → **New + → Blueprint** → select this repo. It reads
   [`render.yaml`](./render.yaml) and creates `food-delivery-socket`.
   - (Manual alternative: New + → Web Service → Build `npm install`,
     Start `npm run socket`, Health check path `/health`.)
2. Deploy. Note the service URL, e.g. `https://food-delivery-socket.onrender.com`.
3. Leave `CLIENT_ORIGIN` unset for now (you'll set it in step 3).

## 2. Web app → Vercel

1. Vercel → **Add New → Project** → import the GitHub repo. It auto-detects
   Next.js (build command `npm run build` already runs `prisma generate`).
2. Add **Environment Variables** (Production):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Supabase **pooled** URL (port 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | Supabase **direct** URL (port 5432) |
   | `NEXTAUTH_SECRET` | a fresh secret — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://food-delivery.vercel.app` |
   | `NEXT_PUBLIC_SOCKET_URL` | the Render socket URL from step 1 |

   `NEXT_PUBLIC_SOCKET_URL` is inlined at build time, so it must be set **before**
   this deploy. You may not know the final Vercel URL yet for `NEXTAUTH_URL` —
   set your best guess, deploy, then correct it and redeploy if it differs.
3. Deploy. Note the web URL.

## 3. Wire the URLs back

1. On **Render**, set `CLIENT_ORIGIN` to the Vercel web URL (exact origin, no
   trailing slash) and redeploy the socket service (fixes CORS).
2. On **Vercel**, confirm `NEXTAUTH_URL` matches the real web URL; redeploy if
   you changed it.

## 4. Smoke test

- Visit the web URL → log in (`customer@example.com` / `password123`).
- Open an order page; the tracker should show **Live** (green dot) — that
  confirms the browser reached the Render socket hub.
- Run the full demo: customer orders → restaurant `/dashboard` advances →
  rider claims + **Simulate drive** → customer sees marker + ETA → delivered →
  review + tips.

---

## Notes & gotchas

- **Render free tier** spins the socket down after ~15 min idle; the first
  request cold-starts (~30s). The tracker reconnects automatically.
- **Migrations** are already applied to Supabase. If you change the schema,
  run `npm run db:migrate` locally (it uses `DIRECT_URL`) before deploying.
- **Prisma on Vercel**: `npm run build` runs `prisma generate` first, so the
  client is always generated in CI.
- **CORS**: the hub allows exactly `CLIENT_ORIGIN`. A mismatch (http vs https,
  trailing slash, wrong subdomain) shows as the tracker stuck on "Connecting…".
- **Railway instead of Render**: create a service from the repo, set start
  command `npm run socket`, and add the `CLIENT_ORIGIN` variable. Railway
  injects `PORT`, which the server already reads.
