import Link from "next/link";

const entryPoints = [
  {
    href: "/restaurants",
    title: "Order food",
    body: "Browse restaurants, build a cart, and place an order.",
    role: "Customer",
  },
  {
    href: "/rider/orders",
    title: "Deliver orders",
    body: "See assigned deliveries with pickup and drop-off on a map.",
    role: "Rider",
  },
  {
    href: "/dashboard",
    title: "Manage orders",
    body: "Accept incoming orders and advance their status.",
    role: "Restaurant",
  },
];

export default function Home() {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          Phase 0 scaffold
        </p>
        <h1 className="text-4xl font-bold tracking-tight">FoodDelivery</h1>
        <p className="max-w-2xl text-lg text-gray-600">
          A food delivery app with live, traffic-aware rider tracking and
          separate tips for riders and restaurants. Pick a role to explore the
          (currently placeholder) routes.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {entryPoints.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group rounded-xl border border-gray-200 p-5 transition hover:border-orange-500 hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              {e.role}
            </p>
            <h2 className="mt-1 text-lg font-semibold group-hover:text-orange-600">
              {e.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{e.body}</p>
          </Link>
        ))}
      </section>

      <footer className="flex gap-4 text-sm">
        <Link href="/login" className="text-orange-600 underline">
          Log in
        </Link>
        <Link href="/register" className="text-orange-600 underline">
          Create account
        </Link>
        <a href="/api/health" className="text-gray-500 underline">
          API health
        </a>
      </footer>
    </main>
  );
}
