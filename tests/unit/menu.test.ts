import { describe, it, expect } from "vitest";
import { menuItemCreateSchema, menuItemUpdateSchema } from "@/lib/menu";

describe("menuItemCreateSchema", () => {
  it("accepts a valid item", () => {
    const r = menuItemCreateSchema.safeParse({
      name: "Pilau",
      description: "Spiced rice",
      priceCents: 850,
      category: "Mains",
      available: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-positive price", () => {
    const r = menuItemCreateSchema.safeParse({ name: "X", priceCents: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const r = menuItemCreateSchema.safeParse({ name: "", priceCents: 100 });
    expect(r.success).toBe(false);
  });

  it("defaults available to true and allows omitting optional fields", () => {
    const r = menuItemCreateSchema.parse({ name: "Soup", priceCents: 350 });
    expect(r.available).toBe(true);
    expect(r.description).toBeUndefined();
  });
});

describe("menuItemUpdateSchema", () => {
  it("allows a partial update", () => {
    const r = menuItemUpdateSchema.safeParse({ available: false });
    expect(r.success).toBe(true);
  });

  it("still rejects an invalid price when present", () => {
    const r = menuItemUpdateSchema.safeParse({ priceCents: -5 });
    expect(r.success).toBe(false);
  });
});
