import { test, expect } from "@playwright/test";

test("menu page redirects an unauthenticated visitor to login", async ({
  page,
}) => {
  await page.goto("/dashboard/menu");
  await expect(page).toHaveURL(/\/login/);
});
