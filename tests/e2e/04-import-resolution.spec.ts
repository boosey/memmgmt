import {
  test,
  expect,
  waitForSignalFlow,
  findRowByTitle,
} from "./fixtures";

test("standing-instruction with live + dead @imports renders matching RelationPills", async ({
  page,
}) => {
  await waitForSignalFlow(page);

  // The "Imports demo section" row in the fixture CLAUDE.md has:
  //   live: @./imports-demo.md     -> path pseudo-node (broken=false)
  //   dead: @./does-not-exist.md   -> path pseudo-node (broken=true)
  const row = findRowByTitle(page, /Imports demo section/i);
  await row.waitFor({ state: "visible" });

  const importPills = row.locator(
    '[data-testid="relation-pill"][data-direction="out"][data-kind="imports"]',
  );
  await expect(importPills.first()).toBeVisible();
  expect(await importPills.count()).toBeGreaterThanOrEqual(2);

  // At least one broken pill — rendered with "missing" badge.
  const broken = row.locator(
    '[data-testid="relation-pill"][data-broken="true"]',
  );
  await expect(broken.first()).toBeVisible();
  await expect(broken.first()).toContainText(/missing/i);

  // At least one live pill — no "missing" badge.
  const live = row.locator(
    '[data-testid="relation-pill"][data-broken="false"][data-kind="imports"]',
  );
  await expect(live.first()).toBeVisible();
  await expect(live.first()).not.toContainText(/missing/i);
});
