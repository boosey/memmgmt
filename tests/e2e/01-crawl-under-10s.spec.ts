import { test, expect, waitForSignalFlow } from "./fixtures";

test("cold load renders Masthead + TypeTabs + first SignalRow in under 10s", async ({
  page,
}) => {
  const start = Date.now();
  await waitForSignalFlow(page);
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10_000);

  // Masthead renders the wordmark + edition tag.
  await expect(page.getByTestId("masthead")).toContainText(/memmgmt/i);
  await expect(page.getByTestId("masthead")).toContainText(
    /Signal Edition · v1\.6/,
  );

  // All 5 scope column headers render in the schematic header.
  for (const label of ["Global", "Plugin", "Slug", "Project", "Local"]) {
    await expect(
      page.getByText(new RegExp(`^${label}$`)).first(),
    ).toBeVisible();
  }

  // At least one SignalRow rendered — fixture has ≥1 standing-instruction.
  const rows = page.locator("[data-row-id]");
  expect(await rows.count()).toBeGreaterThan(0);
});
