import { describe, it, expect } from "vitest";
import { formatPrice, formatEta, formatDistance } from "@/lib/format";

describe("formatPrice", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(1200)).toBe("$12.00");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(50)).toBe("$0.50");
  });
});

describe("formatEta", () => {
  it("formats durations and guards bad input", () => {
    expect(formatEta(20)).toBe("<1 min");
    expect(formatEta(720)).toBe("12 min");
    expect(formatEta(3660)).toBe("1h 1m");
    expect(formatEta(-5)).toBe("—");
    expect(formatEta(Number.NaN)).toBe("—");
  });
});

describe("formatDistance", () => {
  it("formats meters and kilometers", () => {
    expect(formatDistance(800)).toBe("800 m");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBe("—");
  });
});
