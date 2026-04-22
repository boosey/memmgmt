import { test, expect, waitForInventory } from "./fixtures";

test("cold load renders inventory in under 10 seconds", async ({ page }) => {
  const start = Date.now();
  await waitForInventory(page);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10_000);

  // Every scope column should be visible
  for (const label of ["Global", "Slug", "Plugin", "Project", "Local"]) {
    await expect(page.getByText(new RegExp(label, "i")).first()).toBeVisible();
  }
});
