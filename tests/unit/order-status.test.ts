import { describe, it, expect } from "vitest";
import { NEXT_STATUS, canCancel, STATUS_FLOW } from "@/lib/order-status";

describe("order status machine", () => {
  it("advances along the happy path", () => {
    expect(NEXT_STATUS.PLACED).toBe("ACCEPTED");
    expect(NEXT_STATUS.READY_FOR_PICKUP).toBe("PICKED_UP");
    expect(NEXT_STATUS.EN_ROUTE).toBe("DELIVERED");
    expect(NEXT_STATUS.DELIVERED).toBeNull();
    expect(NEXT_STATUS.CANCELLED).toBeNull();
  });

  it("STATUS_FLOW is the ordered happy path without CANCELLED", () => {
    expect(STATUS_FLOW[0]).toBe("PLACED");
    expect(STATUS_FLOW.at(-1)).toBe("DELIVERED");
    expect(STATUS_FLOW).not.toContain("CANCELLED");
  });

  it("allows cancel only before pickup", () => {
    expect(canCancel("PLACED")).toBe(true);
    expect(canCancel("PREPARING")).toBe(true);
    expect(canCancel("READY_FOR_PICKUP")).toBe(true);
    expect(canCancel("PICKED_UP")).toBe(false);
    expect(canCancel("DELIVERED")).toBe(false);
    expect(canCancel("CANCELLED")).toBe(false);
  });
});
