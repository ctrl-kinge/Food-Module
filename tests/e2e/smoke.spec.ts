import { test, expect } from "@playwright/test";

test("landing page renders brand and role cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FoodDelivery" })).toBeVisible();
  await expect(page.getByText("Order food")).toBeVisible();
  await expect(page.getByText("Deliver orders")).toBeVisible();
});

test("login page is public", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("customer route is guarded and redirects to login", async ({ page }) => {
  await page.goto("/restaurants");
  await expect(page).toHaveURL(/\/login$/);
});

test("health endpoint responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).status).toBe("ok");
});
