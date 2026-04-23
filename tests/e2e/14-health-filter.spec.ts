import { test, expect, waitForSignalFlow } from "./fixtures";

test("HealthRibbon chip filters visible rows; clear-filter link restores them", async ({
  page,
}) => {
  await waitForSignalFlow(page);

  const allRowsBefore = await page.locator("[data-row-id]").count();
  expect(allRowsBefore).toBeGreaterThan(0);

  // Click the Dead imports chip — the fixture has at least one dead-import
  // row (Imports demo section with @./does-not-exist.md).
  const chip = page.getByTestId("health-chip-broken-import");
  await chip.click();
  await expect(chip).toHaveAttribute("data-active", "true");

  const afterFilter = await page.locator("[data-row-id]").count();
  expect(afterFilter).toBeLessThan(allRowsBefore);
  expect(afterFilter).toBeGreaterThan(0);

  // Clear filter link appears in the ribbon now that a filter is active.
  const clearLink = page.getByTestId("health-clear-filter");
  await expect(clearLink).toBeVisible();
  await clearLink.click();

  // Rows restored.
  await expect(chip).toHaveAttribute("data-active", "false");
  const restored = await page.locator("[data-row-id]").count();
  expect(restored).toBe(allRowsBefore);
});
