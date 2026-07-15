import Link from "next/link";
import { Card } from "@/components/ui";

const entryPoints = [
  {
    href: "/restaurants",
    title: "Order food",
    body: "Browse restaurants, build a cart, and watch your rider move in real time.",
    role: "Customer",
    icon: "🍽️",
  },
  {
    href: "/rider/orders",
    title: "Deliver orders",
    body: "Go online, get auto-assigned the nearest orders, and navigate pickup → drop-off.",
    role: "Rider",
    icon: "🛵",
  },
  {
    href: "/dashboard",
    title: "Manage orders",
    body: "Take orders, manage your menu, and track your sales analytics.",
    role: "Restaurant",
    icon: "🧑‍🍳",
  },
];

export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-10 px-6 py-16"
    >
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Live tracking · traffic-aware ETAs · separate rider &amp; restaurant tips
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Food<span className="text-brand-600">Delivery</span>
        </h1>
        <p className="max-w-2xl text-lg text-ink-secondary">
          Order from local restaurants and follow your rider on a live map.
          Riders get auto-assigned the nearest orders; restaurants manage their
          menu and watch sales roll in. Pick a role to jump in.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/restaurants"
            className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-surface-deep transition hover:bg-brand-700"
          >
            Browse restaurants
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-surface-border px-5 py-2.5 font-medium text-ink transition hover:border-brand-500"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {entryPoints.map((e) => (
          <Link key={e.href} href={e.href} className="group block">
            <Card className="h-full transition group-hover:border-brand-500 group-hover:shadow-md">
              <div className="text-2xl" aria-hidden>
                {e.icon}
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                {e.role}
              </p>
              <h2 className="mt-1 text-lg font-semibold group-hover:text-brand-600">
                {e.title}
              </h2>
              <p className="mt-2 text-sm text-ink-secondary">{e.body}</p>
            </Card>
          </Link>
        ))}
      </section>

      <footer className="space-y-3 text-sm text-ink-secondary">
        <p>
          <span className="font-medium text-ink">Demo accounts</span>{" "}
          (password{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5">password123</code>):{" "}
          <span className="text-ink-secondary">customer@example.com</span> ·{" "}
          <span className="text-ink-secondary">rider1@example.com</span> ·{" "}
          <span className="text-ink-secondary">restaurant@example.com</span>
        </p>
        <div className="flex gap-4">
          <Link href="/login" className="text-brand-600 underline">
            Log in
          </Link>
          <Link href="/register" className="text-brand-600 underline">
            Create account
          </Link>
          <a href="/api/health" className="text-ink-muted underline">
            API health
          </a>
        </div>
      </footer>
    </main>
  );
}
