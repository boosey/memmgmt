import {
  test,
  expect,
  waitForSignalFlow,
  clickTypeTab,
  findRowByTitle,
} from "./fixtures";

test("ghost slugs surface via HealthRibbon count", async ({ page }) => {
  await waitForSignalFlow(page);
  // Fixture has two ghost project paths (-tmp-fx-proj, -tmp-fx-proj-dead).
  const ribbon = page.getByTestId("health-ribbon");
  await expect(ribbon).toContainText(/ghost slug/i);
  // Text renders as "... 2 ghost slugs · 4 issues" — assert on the trailing
  // summary substring directly.
  const text = (await ribbon.textContent()) ?? "";
  const match = text.match(/(\d+)\s+ghost slugs?/i);
  expect(match).not.toBeNull();
  expect(Number(match![1])).toBeGreaterThan(0);
});

test("dead @import relation pill is marked broken with 'missing' badge", async ({
  page,
}) => {
  await waitForSignalFlow(page);
  const row = findRowByTitle(page, /Imports demo section/i);
  await row.waitFor({ state: "visible" });
  const broken = row.locator(
    '[data-testid="relation-pill"][data-broken="true"]',
  );
  await expect(broken.first()).toBeVisible();
  await expect(broken.first()).toContainText(/missing/i);
});

test("entity with a parseError displays a parse-error badge on its row", async ({
  page,
}) => {
  await waitForSignalFlow(page);
  // Fixture includes a skill (broken-skill) with malformed frontmatter —
  // it surfaces a parseError on the matching skill entity.
  await clickTypeTab(page, "skill");
  const anyBadge = page.getByTestId("row-badge-parse-error");
  await expect(anyBadge.first()).toBeVisible();
});
