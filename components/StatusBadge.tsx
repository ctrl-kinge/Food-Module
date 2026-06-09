import type { OrderStatus } from "@prisma/client";

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  PLACED: { label: "Placed", className: "bg-blue-100 text-blue-800" },
  ACCEPTED: { label: "Accepted", className: "bg-blue-100 text-blue-800" },
  PREPARING: { label: "Preparing", className: "bg-amber-100 text-amber-800" },
  READY_FOR_PICKUP: {
    label: "Ready for pickup",
    className: "bg-amber-100 text-amber-800",
  },
  PICKED_UP: { label: "Picked up", className: "bg-purple-100 text-purple-800" },
  EN_ROUTE: { label: "En route", className: "bg-purple-100 text-purple-800" },
  DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-200 text-gray-700" },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
