import type { OrderStatus } from "@prisma/client";

/** Ordered "happy path" of the delivery lifecycle (excludes CANCELLED). */
export const STATUS_FLOW: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "EN_ROUTE",
  "DELIVERED",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  EN_ROUTE: "En route",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** The single allowed forward transition from each status (null = terminal). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PLACED: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "PICKED_UP",
  PICKED_UP: "EN_ROUTE",
  EN_ROUTE: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

/** An order may be cancelled only before it has been picked up. */
export function canCancel(status: OrderStatus): boolean {
  const i = STATUS_FLOW.indexOf(status);
  return i >= 0 && i < STATUS_FLOW.indexOf("PICKED_UP");
}

export const ALL_STATUSES: OrderStatus[] = [...STATUS_FLOW, "CANCELLED"];
