import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS } from "@/lib/order-status";

// Slim banner shown across customer pages while an order is in progress.
export default async function ActiveOrderBanner({
  customerId,
}: {
  customerId: string;
}) {
  const active = await prisma.order.findFirst({
    where: { customerId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true } } },
  });

  if (!active) return null;

  return (
    <Link
      href={`/orders/${active.id}`}
      className="block bg-orange-600 text-white transition hover:bg-orange-700"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-2 text-sm">
        <span>
          Order in progress · {active.restaurant.name} —{" "}
          <span className="font-medium">{STATUS_LABELS[active.status]}</span>
        </span>
        <span className="shrink-0 underline">Track &rarr;</span>
      </div>
    </Link>
  );
}
