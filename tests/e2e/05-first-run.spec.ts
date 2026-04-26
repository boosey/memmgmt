import { test, expect, waitForSignalFlow } from "./fixtures";

test("cold launch lands on signal-flow — no setup screen, no config prompt", async ({
  page,
}) => {
  await page.goto("/");
  // No welcome / setup / onboarding surface.
  await expect(
    page.getByText(/^welcome|setup wizard|get started|configure app/i),
  ).toHaveCount(0);

  await waitForSignalFlow(page);

  // Masthead + TypeTabs are the root content.
  await expect(page.getByTestId("masthead")).toBeVisible();
  await expect(page.getByTestId("type-tabs")).toBeVisible();

  // At least one type tab has a non-zero count (fixture has standing
  // instructions, skills, commands, etc.)
  const tabs = page.locator('[data-testid^="type-tab-"]');
  const counts = await tabs.evaluateAll((els) =>
    els.map((el) => Number(el.getAttribute("data-count") ?? "0")),
  );
  expect(counts.some((n) => n > 0)).toBe(true);
});
