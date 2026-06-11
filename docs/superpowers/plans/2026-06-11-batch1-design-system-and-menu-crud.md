# Batch 1 — Design System + Restaurant Menu CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a cohesive, accessible design-system layer and give restaurant owners full menu management (add/edit/delete/availability + open/closed), the first of three enhancement batches.

**Architecture:** Add a small `components/ui/` primitive set + Tailwind `brand` scale and apply them across existing screens (evolution, not rewrite). Introduce a `Restaurant.ownerId` link so a `RESTAURANT` user owns exactly one restaurant, then build owner-scoped, Zod-validated menu APIs and a management page. Customers can't order from a closed restaurant.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind v3, Prisma v6 (PostgreSQL/Supabase), NextAuth v4, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-11-enhancements-design.md` (sections A, B-batch1, C).

**Working directory:** All commands run in the `food-delivery` repo
(`c:\Users\njung\source\repos\food-delivery`), not the KhetiaIS workspace.
`db:migrate`/`db:seed` hit the live Supabase DB; the seed wipes data.

---

## File Structure (Batch 1)

**Create:**
- `lib/ui.ts` — `cn()` class joiner + `buttonClasses()` pure helper (unit-tested)
- `lib/menu.ts` — Zod schemas + `getOwnedRestaurant()` data helper
- `components/ui/Button.tsx`, `Spinner.tsx`, `Card.tsx`, `Badge.tsx`, `Container.tsx`, `PageHeader.tsx`, `Field.tsx` (Field/Label/Input/Textarea), `EmptyState.tsx`, `index.ts` (barrel)
- `app/api/menu/route.ts` — `POST` create item
- `app/api/menu/[id]/route.ts` — `PATCH` update, `DELETE` remove
- `app/api/restaurant/route.ts` — `PATCH` toggle `isOpen`
- `app/(restaurant)/dashboard/menu/page.tsx` — server page (load owned restaurant + items)
- `components/MenuManager.tsx` — client UI for the menu page
- `tests/unit/ui.test.ts`, `tests/unit/menu.test.ts`
- `tests/e2e/menu-guard.spec.ts`

**Modify:**
- `prisma/schema.prisma` — add `ownerId`/`owner`/`isOpen`, `category`, `ownedRestaurant`
- `prisma/seed.ts` — link restaurant owner, add `category`
- `tailwind.config.ts` — `brand` colour scale
- `app/globals.css` — Geist font, skip-link styles
- `app/layout.tsx` — skip-to-content link
- `app/(restaurant)/layout.tsx`, `app/(customer)/layout.tsx`, `app/(rider)/layout.tsx` — `<main id="main-content">`
- `components/Toaster.tsx` — `aria-live`
- `components/RestaurantHeader.tsx`, `CustomerHeader.tsx`, `RiderHeader.tsx` — primitives + Menu nav link (restaurant)
- `components/RestaurantCard.tsx` — primitives + Closed badge
- `components/MenuList.tsx` — `isOpen` prop disables Add
- `app/(customer)/restaurants/page.tsx`, `restaurants/[id]/page.tsx` — primitives + closed handling
- `app/(restaurant)/dashboard/page.tsx` — primitives
- `app/api/orders/route.ts` — block orders to a closed restaurant
- `app/(auth)/login/page.tsx`, `register/page.tsx`, `app/(customer)/checkout/page.tsx` — primitives
- `app/page.tsx` — `<main id="main-content">`

---

## Task 1: Schema migration — ownership + open/closed + category

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to the `Restaurant`, `MenuItem`, and `User` models**

In `model Restaurant` add the owner link and open flag:

```prisma
model Restaurant {
  id        String     @id @default(cuid())
  name      String
  lat       Float
  lng       Float
  address   String
  imageUrl  String?
  isOpen    Boolean    @default(true)
  ownerId   String?    @unique
  owner     User?      @relation("RestaurantOwner", fields: [ownerId], references: [id])
  menu      MenuItem[]
  orders    Order[]
  reviews   Review[]
  avgRating Float      @default(0)
}
```

In `model MenuItem` add `category`:

```prisma
  imageUrl     String?
  category     String?
  available    Boolean    @default(true)
```

In `model User` add the back-relation (place near the other relations):

```prisma
  riderOrders     Order[]     @relation("RiderOrders")
  ownedRestaurant Restaurant? @relation("RestaurantOwner")
  reviews         Review[]
```

- [ ] **Step 2: Create and apply the migration**

Run (in `c:\Users\njung\source\repos\food-delivery`):
`npm run db:migrate -- --name batch1_menu_ownership`
Expected: Prisma creates `prisma/migrations/<ts>_batch1_menu_ownership/` and prints "Your database is now in sync with your schema." (Supabase cold start may need a retry.)

- [ ] **Step 3: Regenerate the client (usually automatic after migrate)**

Run: `npm run db:generate`
Expected: "Generated Prisma Client".

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add restaurant ownership, open flag, and menu category"
```

---

## Task 2: Seed — link the restaurant owner and add categories

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Capture the restaurant user and attach it to a restaurant**

Replace the `createMany` users block + the restaurant loop so the owner is linked. Change the users creation to capture the restaurant user id, and add a `category` to each menu item and an `ownerId` to the first restaurant.

Replace lines 20–102 (`await prisma.user.createMany(...)` through the seeding loop) with:

```ts
  await prisma.user.createMany({
    data: [
      { name: "Casey Customer", email: "customer@example.com", password, role: "CUSTOMER", phone: "+254700000001" },
      { name: "Rhea Rider", email: "rider1@example.com", password, role: "RIDER", phone: "+254700000002" },
      { name: "Riku Rider", email: "rider2@example.com", password, role: "RIDER", phone: "+254700000003" },
      { name: "Rosa Restaurant", email: "restaurant@example.com", password, role: "RESTAURANT", phone: "+254700000004" },
    ],
  });

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: "restaurant@example.com" },
  });

  const restaurants = [
    {
      name: "Mama's Kitchen",
      address: "Kimathi Street, Nairobi CBD",
      lat: -1.2841,
      lng: 36.8233,
      ownerId: owner.id,
      menu: [
        { name: "Nyama Choma Platter", description: "Grilled beef with kachumbari", priceCents: 1200, category: "Mains" },
        { name: "Ugali & Sukuma", description: "Cornmeal with sautéed greens", priceCents: 500, category: "Mains" },
        { name: "Pilau & Kuku", description: "Spiced rice with chicken", priceCents: 850, category: "Mains" },
        { name: "Mandazi (4)", description: "Lightly sweet fried dough", priceCents: 300, category: "Sides" },
      ],
    },
    {
      name: "Bella Napoli",
      address: "Westlands Road, Nairobi",
      lat: -1.2649,
      lng: 36.8047,
      ownerId: null,
      menu: [
        { name: "Margherita Pizza", description: "Tomato, mozzarella, basil", priceCents: 950, category: "Pizza" },
        { name: "Pepperoni Pizza", description: "Loaded with pepperoni", priceCents: 1150, category: "Pizza" },
        { name: "Spaghetti Carbonara", description: "Egg, pancetta, pecorino", priceCents: 1050, category: "Pasta" },
        { name: "Tiramisu", description: "Classic coffee dessert", priceCents: 600, category: "Dessert" },
      ],
    },
    {
      name: "Sushi Zen",
      address: "Ngong Road, Nairobi",
      lat: -1.2987,
      lng: 36.7825,
      ownerId: null,
      menu: [
        { name: "Salmon Nigiri (2)", description: "Fresh salmon over rice", priceCents: 700, category: "Sushi" },
        { name: "California Roll (8)", description: "Crab, avocado, cucumber", priceCents: 900, category: "Sushi" },
        { name: "Chicken Teriyaki Bowl", description: "Grilled chicken, steamed rice", priceCents: 1100, category: "Bowls" },
        { name: "Miso Soup", description: "Tofu, seaweed, scallion", priceCents: 350, category: "Sides" },
      ],
    },
  ];

  for (const r of restaurants) {
    await prisma.restaurant.create({
      data: {
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        ownerId: r.ownerId,
        menu: { create: r.menu },
      },
    });
  }
```

- [ ] **Step 2: Reseed (NOTE: wipes demo data, as the seed already does)**

Run: `npm run db:seed`
Expected: "Seeded 3 restaurants and 4 users (password: "password123")."

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): link demo restaurant to owner and add menu categories"
```

---

## Task 3: `lib/ui.ts` — class helpers (TDD)

**Files:**
- Create: `lib/ui.ts`
- Test: `tests/unit/ui.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ui.test.ts
import { describe, it, expect } from "vitest";
import { cn, buttonClasses } from "@/lib/ui";

describe("cn", () => {
  it("joins truthy class fragments and drops falsy ones", () => {
    expect(cn("a", false, undefined, "b", null, "c")).toBe("a b c");
  });
});

describe("buttonClasses", () => {
  it("includes the primary brand background by default", () => {
    const c = buttonClasses();
    expect(c).toContain("bg-brand-600");
    expect(c).toContain("px-4"); // md size
  });

  it("maps the danger variant and sm size", () => {
    const c = buttonClasses({ variant: "danger", size: "sm" });
    expect(c).toContain("bg-red-600");
    expect(c).toContain("px-3");
    expect(c).not.toContain("bg-brand-600");
  });

  it("always includes disabled styling and rounded shape", () => {
    const c = buttonClasses({ variant: "ghost" });
    expect(c).toContain("rounded-md");
    expect(c).toContain("disabled:opacity-50");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/ui.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/ui'".

- [ ] **Step 3: Implement `lib/ui.ts`**

```ts
// lib/ui.ts
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

/** Join class fragments, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-gray-300 bg-white text-gray-900 hover:border-brand-500",
  ghost: "text-gray-700 hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize } = {},
): string {
  const { variant = "primary", size = "md" } = opts;
  return cn(BASE, VARIANTS[variant], SIZES[size]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/ui.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ui.ts tests/unit/ui.test.ts
git commit -m "feat(ui): add cn + buttonClasses helpers with tests"
```

---

## Task 4: UI primitives (`components/ui/`)

**Files:**
- Create: `components/ui/Button.tsx`, `Spinner.tsx`, `Card.tsx`, `Badge.tsx`, `Container.tsx`, `PageHeader.tsx`, `Field.tsx`, `EmptyState.tsx`, `index.ts`

- [ ] **Step 1: `Spinner.tsx`**

```tsx
// components/ui/Spinner.tsx
export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
```

- [ ] **Step 2: `Button.tsx`**

```tsx
// components/ui/Button.tsx
import { buttonClasses, cn, type ButtonVariant, type ButtonSize } from "@/lib/ui";
import Spinner from "./Spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export default function Button({
  variant,
  size,
  loading = false,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(buttonClasses({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
```

- [ ] **Step 3: `Card.tsx`**

```tsx
// components/ui/Card.tsx
import { cn } from "@/lib/ui";

export default function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: `Badge.tsx`**

```tsx
// components/ui/Badge.tsx
import { cn } from "@/lib/ui";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  brand: "bg-brand-100 text-brand-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
};

export default function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: `Container.tsx`**

```tsx
// components/ui/Container.tsx
import { cn } from "@/lib/ui";

const SIZES = { sm: "max-w-3xl", md: "max-w-5xl", lg: "max-w-7xl" } as const;

export default function Container({
  size = "md",
  className,
  children,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-6 py-8", SIZES[size], className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: `PageHeader.tsx`**

```tsx
// components/ui/PageHeader.tsx
export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 7: `Field.tsx` (Field + Label + Input + Textarea)**

```tsx
// components/ui/Field.tsx
import { useId } from "react";
import { cn } from "@/lib/ui";

const INPUT =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:border-brand-500";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: { id: string; describedBy?: string }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="mt-1">{children({ id, describedBy: errorId })}</div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(INPUT, className)} {...rest} />;
}
```

- [ ] **Step 8: `EmptyState.tsx`**

```tsx
// components/ui/EmptyState.tsx
export default function EmptyState({
  icon = "🍽️",
  message,
  action,
}: {
  icon?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 9: `index.ts` barrel**

```ts
// components/ui/index.ts
export { default as Button } from "./Button";
export { default as Spinner } from "./Spinner";
export { default as Card } from "./Card";
export { default as Badge } from "./Badge";
export { default as Container } from "./Container";
export { default as PageHeader } from "./PageHeader";
export { default as EmptyState } from "./EmptyState";
export { Field, Input, Textarea } from "./Field";
```

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add components/ui
git commit -m "feat(ui): add Button/Card/Badge/Container/PageHeader/Field/EmptyState/Spinner primitives"
```

---

## Task 5: Theme, font fix, and accessibility baseline

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `components/Toaster.tsx`, the three role layouts, `app/page.tsx`

- [ ] **Step 1: Add the `brand` colour scale**

In `tailwind.config.ts`, extend `theme.extend.colors`:

```ts
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
    },
  },
```

- [ ] **Step 2: Apply the Geist font + skip-link styles in `app/globals.css`**

Replace the `body` rule (lines 6–10) and add skip-link styles. New `body` rule:

```css
body {
  color: #171717;
  background: #ffffff;
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}

/* Skip link: visually hidden until focused. */
.skip-link {
  position: absolute;
  left: 0.5rem;
  top: -3rem;
  z-index: 50;
  border-radius: 0.375rem;
  background: #ea580c;
  color: #ffffff;
  padding: 0.5rem 0.75rem;
  transition: top 0.15s ease;
}
.skip-link:focus {
  top: 0.5rem;
}
```

- [ ] **Step 3: Add the skip link in `app/layout.tsx`**

Inside `<body>`, before `<Providers>`:

```tsx
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
```

- [ ] **Step 4: Wrap content in `<main id="main-content">`**

In `app/(restaurant)/layout.tsx`, change the return to:

```tsx
  return (
    <div className="min-h-screen">
      <RestaurantHeader />
      <main id="main-content">{children}</main>
    </div>
  );
```

In `app/(customer)/layout.tsx` and `app/(rider)/layout.tsx`, wrap their `{children}` the same way: replace the bare `{children}` render with `<main id="main-content">{children}</main>` (keep each file's existing header/banner elements above it).

In `app/page.tsx` (landing) wrap the page's top-level content element so it has `id="main-content"` (add `id="main-content"` to the outermost `<main>`/`<div>` it already renders; if it renders a `<div>`, change it to `<main id="main-content">`).

- [ ] **Step 5: Announce toasts politely**

In `components/Toaster.tsx`, add `aria-live="polite"` and `aria-atomic="false"` to the toast list container (the outer wrapper `<div>` that maps over toasts).

- [ ] **Step 6: Verify build + existing tests**

Run: `npm run build`
Expected: compiles with no type errors.
Run: `npx vitest run`
Expected: all existing + new unit tests PASS.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx app/page.tsx "app/(restaurant)/layout.tsx" "app/(customer)/layout.tsx" "app/(rider)/layout.tsx" components/Toaster.tsx
git commit -m "feat(ui): brand theme, Geist font, skip link, main landmarks, live toasts"
```

---

## Task 6: `lib/menu.ts` — validation + owner lookup (TDD)

**Files:**
- Create: `lib/menu.ts`
- Test: `tests/unit/menu.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/menu.test.ts
import { describe, it, expect } from "vitest";
import { menuItemCreateSchema, menuItemUpdateSchema } from "@/lib/menu";

describe("menuItemCreateSchema", () => {
  it("accepts a valid item", () => {
    const r = menuItemCreateSchema.safeParse({
      name: "Pilau",
      description: "Spiced rice",
      priceCents: 850,
      category: "Mains",
      available: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-positive price", () => {
    const r = menuItemCreateSchema.safeParse({ name: "X", priceCents: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const r = menuItemCreateSchema.safeParse({ name: "", priceCents: 100 });
    expect(r.success).toBe(false);
  });

  it("defaults available to true and allows omitting optional fields", () => {
    const r = menuItemCreateSchema.parse({ name: "Soup", priceCents: 350 });
    expect(r.available).toBe(true);
    expect(r.description).toBeUndefined();
  });
});

describe("menuItemUpdateSchema", () => {
  it("allows a partial update", () => {
    const r = menuItemUpdateSchema.safeParse({ available: false });
    expect(r.success).toBe(true);
  });

  it("still rejects an invalid price when present", () => {
    const r = menuItemUpdateSchema.safeParse({ priceCents: -5 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/menu.test.ts`
Expected: FAIL — "Failed to resolve import '@/lib/menu'".

- [ ] **Step 3: Implement `lib/menu.ts`**

```ts
// lib/menu.ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const menuItemCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().positive(),
  category: z.string().trim().max(60).optional(),
  available: z.boolean().default(true),
});

export const menuItemUpdateSchema = menuItemCreateSchema.partial();

export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;

/** The single restaurant owned by this user, or null. */
export function getOwnedRestaurant(userId: string) {
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/menu.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/menu.ts tests/unit/menu.test.ts
git commit -m "feat(menu): add Zod schemas and owned-restaurant lookup"
```

---

## Task 7: Menu + restaurant API routes

**Files:**
- Create: `app/api/menu/route.ts`, `app/api/menu/[id]/route.ts`, `app/api/restaurant/route.ts`

- [ ] **Step 1: `POST /api/menu` (create)**

```ts
// app/api/menu/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { menuItemCreateSchema, getOwnedRestaurant } from "@/lib/menu";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const restaurant = await getOwnedRestaurant(session.user.id);
  if (!restaurant) {
    return NextResponse.json({ error: "No restaurant for this account" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = menuItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const item = await prisma.menuItem.create({
    data: { ...parsed.data, restaurantId: restaurant.id },
  });
  return NextResponse.json(item, { status: 201 });
}
```

- [ ] **Step 2: `PATCH`/`DELETE /api/menu/[id]`**

```ts
// app/api/menu/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { menuItemUpdateSchema, getOwnedRestaurant } from "@/lib/menu";

async function ownItem(userId: string, itemId: string) {
  const restaurant = await getOwnedRestaurant(userId);
  if (!restaurant) return null;
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.restaurantId !== restaurant.id) return null;
  return item;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const owned = await ownItem(session.user.id, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = menuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const item = await prisma.menuItem.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const owned = await ownItem(session.user.id, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.menuItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: `PATCH /api/restaurant` (toggle open/closed)**

```ts
// app/api/restaurant/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedRestaurant } from "@/lib/menu";

const schema = z.object({ isOpen: z.boolean() });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "RESTAURANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const restaurant = await getOwnedRestaurant(session.user.id);
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { isOpen: parsed.data.isOpen },
  });
  return NextResponse.json({ id: updated.id, isOpen: updated.isOpen });
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/menu app/api/restaurant
git commit -m "feat(menu): owner-scoped menu CRUD + open/closed API routes"
```

---

## Task 8: Menu management page

**Files:**
- Create: `app/(restaurant)/dashboard/menu/page.tsx`, `components/MenuManager.tsx`
- Modify: `components/RestaurantHeader.tsx` (nav link)

- [ ] **Step 1: Server page — load the owned restaurant + items**

```tsx
// app/(restaurant)/dashboard/menu/page.tsx
import { getCurrentUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Container, PageHeader, EmptyState } from "@/components/ui";
import MenuManager from "@/components/MenuManager";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = await getCurrentUser();
  const restaurant = user
    ? await prisma.restaurant.findUnique({
        where: { ownerId: user.id },
        include: { menu: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
      })
    : null;

  return (
    <Container size="sm">
      <PageHeader
        title="Menu"
        subtitle="Add, edit, and toggle the dishes customers can order."
      />
      {!restaurant ? (
        <div className="mt-6">
          <EmptyState message="No restaurant is linked to this account yet." />
        </div>
      ) : (
        <div className="mt-6">
          <MenuManager
            isOpen={restaurant.isOpen}
            items={restaurant.menu.map((m) => ({
              id: m.id,
              name: m.name,
              description: m.description,
              priceCents: m.priceCents,
              category: m.category,
              available: m.available,
            }))}
          />
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Client `MenuManager.tsx`**

```tsx
// components/MenuManager.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, Field, Input, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { toast } from "@/lib/toast";

type Item = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string | null;
  available: boolean;
};

const EMPTY = { name: "", description: "", priceDollars: "", category: "" };

export default function MenuManager({
  isOpen,
  items,
}: {
  isOpen: boolean;
  items: Item[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(isOpen);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function toggleOpen() {
    setBusy(true);
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !open }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not update status");
    setOpen(!open);
    toast.success(!open ? "Restaurant is now open" : "Restaurant is now closed");
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.priceDollars) * 100);
    if (!form.name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
      return toast.error("Enter a name and a price greater than 0");
    }
    setBusy(true);
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        priceCents,
      }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not add item");
    setForm(EMPTY);
    toast.success("Item added");
    router.refresh();
  }

  async function toggleAvailable(item: Item) {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    if (!res.ok) return toast.error("Could not update item");
    router.refresh();
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete item");
    toast.success("Item deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-semibold">
            Status: {open ? "Open" : "Closed"}{" "}
            <Badge tone={open ? "success" : "danger"}>
              {open ? "Accepting orders" : "Not accepting orders"}
            </Badge>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Customers can only order when your restaurant is open.
          </p>
        </div>
        <Button
          variant={open ? "danger" : "primary"}
          loading={busy}
          onClick={toggleOpen}
        >
          {open ? "Close" : "Open"}
        </Button>
      </Card>

      <Card>
        <h2 className="font-semibold">Add an item</h2>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            {({ id }) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
          </Field>
          <Field label="Price (USD)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                placeholder="8.50"
                value={form.priceDollars}
                onChange={(e) =>
                  setForm({ ...form, priceDollars: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="Category (optional)">
            {({ id }) => (
              <Input
                id={id}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            )}
          </Field>
          <Field label="Description (optional)">
            {({ id }) => (
              <Textarea
                id={id}
                rows={1}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy}>
              Add item
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Your menu ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.name}{" "}
                      {!item.available && (
                        <Badge tone="neutral">Unavailable</Badge>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.priceCents)}
                      {item.category ? ` · ${item.category}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleAvailable(item)}
                    >
                      {item.available ? "Mark unavailable" : "Mark available"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add a "Menu" nav link in `RestaurantHeader.tsx`**

Replace the header body so the brand link and a nav sit on the left and Sign out on the right:

```tsx
// components/RestaurantHeader.tsx
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function RestaurantHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold">
            Food<span className="text-brand-600">Delivery</span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              Restaurant
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-700 hover:text-brand-600">
              Orders
            </Link>
            <Link
              href="/dashboard/menu"
              className="text-gray-700 hover:text-brand-600"
            >
              Menu
            </Link>
          </nav>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Manual smoke (build) + typecheck**

Run: `npm run build`
Expected: compiles; `/dashboard/menu` appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add "app/(restaurant)/dashboard/menu" components/MenuManager.tsx components/RestaurantHeader.tsx
git commit -m "feat(menu): restaurant menu management page + nav"
```

---

## Task 9: Closed-restaurant handling (customer side + order guard)

**Files:**
- Modify: `app/api/orders/route.ts`, `components/RestaurantCard.tsx`, `components/MenuList.tsx`, `app/(customer)/restaurants/page.tsx`, `app/(customer)/restaurants/[id]/page.tsx`

- [ ] **Step 1: Block orders to a closed restaurant**

In `app/api/orders/route.ts`, after destructuring `parsed.data` (after line 43) and before the menu-item lookup, add:

```ts
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isOpen: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  if (!restaurant.isOpen) {
    return NextResponse.json(
      { error: "This restaurant is currently closed" },
      { status: 409 },
    );
  }
```

- [ ] **Step 2: Pass `isOpen` to `RestaurantCard` and show a Closed badge**

In `components/RestaurantCard.tsx`, add `isOpen: boolean` to `RestaurantCardProps`, accept it, and render a badge in the image overlay. Replace the image `<div>` and the title line:

```tsx
import Link from "next/link";
import Rating from "@/components/Rating";
import { Badge } from "@/components/ui";

type RestaurantCardProps = {
  id: string;
  name: string;
  address: string;
  imageUrl: string | null;
  isOpen: boolean;
  avgRating: number;
  menuCount: number;
  reviewCount: number;
};

export default function RestaurantCard({
  id,
  name,
  address,
  imageUrl,
  isOpen,
  avgRating,
  menuCount,
  reviewCount,
}: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${id}`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-brand-100 to-amber-50 text-4xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>🍽️</span>
        )}
        {!isOpen && (
          <span className="absolute right-2 top-2">
            <Badge tone="danger">Closed</Badge>
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h2 className="font-semibold group-hover:text-brand-600">{name}</h2>
        <p className="text-sm text-gray-600">{address}</p>
        <div className="flex items-center justify-between pt-1">
          <Rating rating={avgRating} count={reviewCount} />
          <span className="text-xs text-gray-500">{menuCount} items</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Pass `isOpen` from the restaurants list page**

In `app/(customer)/restaurants/page.tsx`, the query already returns `isOpen` (full row). Add `isOpen={r.isOpen}` to the `<RestaurantCard ... />` props, and wrap the page in primitives:

```tsx
import { prisma } from "@/lib/prisma";
import RestaurantCard from "@/components/RestaurantCard";
import { Container, PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { menu: true, reviews: true } } },
  });

  return (
    <Container>
      <PageHeader title="Restaurants" subtitle="Choose a place to order from." />
      {restaurants.length === 0 ? (
        <div className="mt-8">
          <EmptyState message="No restaurants yet." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              id={r.id}
              name={r.name}
              address={r.address}
              imageUrl={r.imageUrl}
              isOpen={r.isOpen}
              avgRating={r.avgRating}
              menuCount={r._count.menu}
              reviewCount={r._count.reviews}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 4: Disable ordering on a closed restaurant detail page**

In `components/MenuList.tsx`, add an `isOpen` prop (default `true`) to the component props and, when `false`, render a notice instead of the Add controls. Add to the props type `isOpen?: boolean;`, destructure with `isOpen = true`, and guard the Add button: wrap the existing `qty > 0 ? (...) : (<button>Add</button>)` ternary so that when `!isOpen` it renders `<span className="text-sm text-gray-400">Closed</span>` instead. Concretely, change the right-hand cell to:

```tsx
              {!isOpen ? (
                <span className="text-sm text-gray-400">Closed</span>
              ) : qty > 0 ? (
                <div className="flex items-center gap-2">
                  {/* existing − / qty / + controls unchanged */}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Add
                </button>
              )}
```

(Keep the existing − / qty / + markup inside the middle branch exactly as-is.)

- [ ] **Step 5: Pass `isOpen` + closed notice from the restaurant detail page**

In `app/(customer)/restaurants/[id]/page.tsx`: the `findUnique` result already includes `isOpen`. Add a closed banner above the menu and pass `isOpen` to `MenuList`. After the `<Rating ... />` block and before the menu conditional, add:

```tsx
      {!restaurant.isOpen && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          This restaurant is currently closed and isn’t accepting orders.
        </p>
      )}
```

And update the `<MenuList ... />` usage to include `isOpen={restaurant.isOpen}`.

- [ ] **Step 6: Verify build + unit tests**

Run: `npm run build` (expected: passes)
Run: `npx vitest run` (expected: all PASS)

- [ ] **Step 7: Commit**

```bash
git add app/api/orders/route.ts components/RestaurantCard.tsx components/MenuList.tsx "app/(customer)/restaurants/page.tsx" "app/(customer)/restaurants/[id]/page.tsx"
git commit -m "feat(menu): block ordering from closed restaurants + Closed badges"
```

---

## Task 10: Restyle dashboard + headers onto primitives

**Files:**
- Modify: `app/(restaurant)/dashboard/page.tsx`, `components/CustomerHeader.tsx`, `components/RiderHeader.tsx`

- [ ] **Step 1: Dashboard page — use `Container`/`PageHeader`/`Card`/`Badge`**

In `app/(restaurant)/dashboard/page.tsx`: replace the outer `<div className="mx-auto max-w-3xl px-6 py-8">` with `<Container size="sm">`, replace the `<h1>`/subtitle block with `<PageHeader title="Incoming orders" subtitle="Advance each order through the lifecycle — customers see changes live. New orders appear here automatically." actions={<DashboardLive />} />`, change the `OrderCard` `<li>` wrapper to use the `Card` component, and import `Container, PageHeader, Card` from `@/components/ui`. Keep `StatusBadge` and `OrderAdvanceControls` as-is.

- [ ] **Step 2: `CustomerHeader.tsx` and `RiderHeader.tsx` — brand colour token**

In both headers, change any `text-orange-600`/`bg-orange-600`/`hover:*-orange-*` utility to the equivalent `brand` token (`text-brand-600`, etc.) so they match the new theme. Leave structure/links unchanged.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add "app/(restaurant)/dashboard/page.tsx" components/CustomerHeader.tsx components/RiderHeader.tsx
git commit -m "style(ui): restyle dashboard and headers onto primitives + brand tokens"
```

---

## Task 11: Restyle auth + checkout forms

**Files:**
- Modify: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(customer)/checkout/page.tsx`

- [ ] **Step 1: Login + register — use `Card`/`Field`/`Input`/`Button`**

In `app/(auth)/login/page.tsx` and `register/page.tsx`, wrap the form in a centered `Card`, replace raw `<input>`s with `Field` + `Input`, the submit `<button>` with `<Button type="submit" loading={...}>`, and any `orange` utility classes with `brand`. Keep all existing state/handlers, field names, and submit logic exactly as they are.

- [ ] **Step 2: Checkout — primitives**

In `app/(customer)/checkout/page.tsx`, replace the place-order `<button>` with `<Button loading={submitting}>`, wrap the summary/address sections in `Card`, and swap `orange` utilities for `brand`. Keep the `AddressPicker` usage and order-submit logic unchanged.

- [ ] **Step 3: Build + manual check**

Run: `npm run build`
Expected: passes. Manually confirm login still submits and checkout still places an order.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/register/page.tsx" "app/(customer)/checkout/page.tsx"
git commit -m "style(ui): restyle auth and checkout onto primitives"
```

---

## Task 12: E2E guard + final verification

**Files:**
- Create: `tests/e2e/menu-guard.spec.ts`

- [ ] **Step 1: Write the guard test**

```ts
// tests/e2e/menu-guard.spec.ts
import { test, expect } from "@playwright/test";

test("menu page redirects an unauthenticated visitor to login", async ({
  page,
}) => {
  await page.goto("/dashboard/menu");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e`
Expected: all smoke specs + the new guard test PASS. (First run may need `npx playwright install chromium`.)

- [ ] **Step 3: Full verification pass**

Run: `npm run build` → passes
Run: `npx vitest run` → all unit tests PASS
Run: `npm run lint` → no errors

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/menu-guard.spec.ts
git commit -m "test(e2e): guard the restaurant menu route"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** Task 1–2 cover spec §B-batch1 (ownership, isOpen, category, seed). Tasks 3–5 cover §A (primitives, theme, font fix, a11y landmarks/skip-link/live region). Tasks 6–8 cover §C.2 (menu CRUD + open/closed toggle + nav). Task 9 covers §C.2 customer-side closed handling + order guard. Tasks 10–11 cover §A.4 (refactor existing screens). Task 12 covers §F.1 e2e guard.
- **Migrations are remote (Supabase).** `db:migrate`/`db:seed` hit the live DB and the seed wipes data — expected for this demo project; warn the user before reseeding if they have data they care about.
- **Out of scope here (later batches):** rider online/offline + auto-assign (Batch 2); notifications, web push, reorder, saved addresses, analytics (Batch 3).
```
