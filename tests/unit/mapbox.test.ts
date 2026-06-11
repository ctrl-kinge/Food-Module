import { describe, it, expect } from "vitest";
import { haversineMeters, fallbackEta } from "@/lib/mapbox";

const CBD = { lat: -1.2841, lng: 36.8233 };
const WESTLANDS = { lat: -1.2649, lng: 36.8047 };

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(CBD, CBD)).toBe(0);
  });

  it("approximates a known short distance", () => {
    const d = haversineMeters(CBD, WESTLANDS);
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(4000);
  });

  it("is symmetric", () => {
    expect(haversineMeters(CBD, WESTLANDS)).toBeCloseTo(
      haversineMeters(WESTLANDS, CBD),
      6,
    );
  });
});

describe("fallbackEta", () => {
  it("returns a non-traffic, labeled estimate", () => {
    const e = fallbackEta(CBD, WESTLANDS);
    expect(e.trafficAware).toBe(false);
    expect(e.label).toMatch(/estimate/i);
    expect(e.etaSeconds).toBeGreaterThan(0);
    expect(e.distanceMeters).toBeGreaterThan(0);
  });
});
