import { describe, it, expect } from "vitest";
import { cn, buttonClasses } from "@/lib/ui";

describe("cn", () => {
  it("joins truthy class fragments and drops falsy ones", () => {
    expect(cn("a", false, undefined, "b", null, "c")).toBe("a b c");
  });
});

describe("buttonClasses", () => {
  it("includes the primary brand background by default", () => {
    const c = buttonClasses();
    expect(c).toContain("bg-brand-500");
    expect(c).toContain("px-4"); // md size
  });

  it("maps the danger variant and sm size", () => {
    const c = buttonClasses({ variant: "danger", size: "sm" });
    expect(c).toContain("bg-red-600");
    expect(c).toContain("px-3");
    expect(c).not.toContain("bg-brand-500");
  });

  it("always includes disabled styling and rounded shape", () => {
    const c = buttonClasses({ variant: "ghost" });
    expect(c).toContain("rounded-md");
    expect(c).toContain("disabled:opacity-50");
  });
});
