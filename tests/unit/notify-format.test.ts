import { describe, it, expect } from "vitest";
import { notificationContent } from "@/lib/notify-format";

describe("notificationContent", () => {
  it("describes an order status update for the customer", () => {
    const c = notificationContent("ORDER_STATUS", {
      orderShortId: "abc123",
      statusLabel: "En route",
    });
    expect(c.title).toBe("Order update");
    expect(c.body).toContain("abc123");
    expect(c.body).toContain("En route");
  });

  it("describes a new order for the restaurant", () => {
    const c = notificationContent("NEW_ORDER", { orderShortId: "xy" });
    expect(c.title).toBe("New order");
    expect(c.body).toContain("xy");
  });

  it("describes an assignment for the rider with restaurant name", () => {
    const c = notificationContent("ASSIGNED", {
      orderShortId: "z9",
      restaurantName: "Mama's Kitchen",
    });
    expect(c.title).toBe("New delivery");
    expect(c.body).toContain("Mama's Kitchen");
  });

  it("describes a new review", () => {
    const c = notificationContent("REVIEW", { orderShortId: "q1" });
    expect(c.title).toBe("New review");
    expect(c.body).toContain("q1");
  });
});
