import type { NotificationType } from "@prisma/client";

export type NotifyContext = {
  orderShortId?: string;
  statusLabel?: string;
  restaurantName?: string;
};

/** Build the title/body shown in-app and pushed, per notification type. */
export function notificationContent(
  type: NotificationType,
  ctx: NotifyContext,
): { title: string; body: string } {
  const order = ctx.orderShortId ? `#${ctx.orderShortId}` : "your order";
  switch (type) {
    case "ORDER_STATUS":
      return {
        title: "Order update",
        body: `Order ${order} is now ${ctx.statusLabel ?? "updated"}.`,
      };
    case "NEW_ORDER":
      return { title: "New order", body: `You have a new order ${order}.` };
    case "ASSIGNED":
      return {
        title: "New delivery",
        body: `You've been assigned order ${order}${
          ctx.restaurantName ? ` from ${ctx.restaurantName}` : ""
        }.`,
      };
    case "REVIEW":
      return { title: "New review", body: `A customer reviewed order ${order}.` };
  }
}
