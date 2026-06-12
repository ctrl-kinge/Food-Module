import { describe, it, expect } from "vitest";
import { selectNearestRider } from "@/lib/dispatch";

const restaurant = { lat: -1.2841, lng: 36.8233 }; // Nairobi CBD

describe("selectNearestRider", () => {
  it("returns the closest rider by great-circle distance", () => {
    const riders = [
      { id: "far", lastLat: -1.35, lastLng: 36.9 },
      { id: "near", lastLat: -1.285, lastLng: 36.824 },
      { id: "mid", lastLat: -1.3, lastLng: 36.84 },
    ];
    expect(selectNearestRider(restaurant, riders)).toBe("near");
  });

  it("ignores riders without a known position", () => {
    const riders = [
      { id: "noco", lastLat: null, lastLng: null },
      { id: "haspos", lastLat: -1.29, lastLng: 36.83 },
    ];
    expect(selectNearestRider(restaurant, riders)).toBe("haspos");
  });

  it("returns null when no rider has coordinates", () => {
    expect(
      selectNearestRider(restaurant, [
        { id: "a", lastLat: null, lastLng: null },
      ]),
    ).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(selectNearestRider(restaurant, [])).toBeNull();
  });
});
