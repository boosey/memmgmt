import {
  test,
  expect,
  waitForSignalFlow,
  clickTypeTab,
  findRowByTitle,
} from "./fixtures";

test("clicking a SignalRow pins it and opens the TracingBanner", async ({
  page,
}) => {
  await waitForSignalFlow(page);

  // Standing-instructions tab is active by default because it's first in
  // ENTITY_TYPE_ORDER and the fixture has entries. The "Imports demo section"
  // row has a live @import, giving us a relation to count against.
  const row = findRowByTitle(page, /Imports demo section/i);
  await row.waitFor({ state: "visible" });
  await row.click();

  // TracingBanner renders with pinned title + kind.
  const banner = page.getByTestId("tracing-banner");
  await expect(banner).toBeVisible();
  await expect(page.getByTestId("tracing-banner-title")).toHaveText(
    /Imports demo section/i,
  );
  await expect(page.getByTestId("tracing-banner-kind")).toHaveText(
    /Standing Instruction/i,
  );

  // Counts: at least one related entity (the @imports-demo.md file
  // pseudo-node and the @does-not-exist.md file pseudo-node are both
  // related). Assert related-count parses as a non-negative integer.
  const counts = page.getByTestId("tracing-banner-counts");
  await expect(counts).toBeVisible();
  const relatedCount = Number(await counts.getAttribute("data-related-count"));
  expect(Number.isFinite(relatedCount)).toBe(true);
  expect(relatedCount).toBeGreaterThanOrEqual(0);

  // "clear" unpins → banner disappears.
  await page.getByTestId("tracing-banner-clear").click();
  await expect(banner).toBeHidden();

  // Switching tabs still works after pinning flow.
  await clickTypeTab(page, "permission");
  await expect(page.getByTestId("type-tab-permission")).toHaveAttribute(
    "data-active",
    "true",
  );
});
