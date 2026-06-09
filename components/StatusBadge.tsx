import type { OrderStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/order-status";

const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-amber-100 text-amber-800",
  READY_FOR_PICKUP: "bg-amber-100 text-amber-800",
  PICKED_UP: "bg-purple-100 text-purple-800",
  EN_ROUTE: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
