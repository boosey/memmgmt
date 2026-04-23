import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend({});
export { expect };

/**
 * Wait for the signal-flow page to be fully hydrated against /api/graph.
 *
 * Completion signals (all must resolve within `timeout`):
 *  - Masthead is visible
 *  - TypeTabs render
 *  - Either at least one SignalRow has rendered, OR the empty-state message
 *    is visible (legitimate for first-run / all-empty-types fixtures)
 */
export async function waitForSignalFlow(page: Page, timeout = 10_000) {
  await page.goto("/");
  await page.getByTestId("masthead").waitFor({ state: "visible", timeout });
  await page.getByTestId("type-tabs").waitFor({ state: "visible", timeout });
  const firstRow = page.locator("[data-row-id]").first();
  const emptyState = page.getByText(/No entities of this kind\./i);
  await Promise.race([
    firstRow.waitFor({ state: "visible", timeout }),
    emptyState.waitFor({ state: "visible", timeout }),
  ]);
}

/** Click the type tab for a given entity type (e.g. "standing-instruction"). */
export async function clickTypeTab(page: Page, type: string) {
  await page.getByTestId(`type-tab-${type}`).click();
}

/** Locator for the first SignalRow whose visible text contains `title`. */
export function findRowByTitle(page: Page, title: string | RegExp) {
  return page.locator("[data-row-id]", { hasText: title }).first();
}

/** Click the body of the first row whose title matches — pins the entity. */
export async function pinRowByTitle(page: Page, title: string | RegExp) {
  const row = findRowByTitle(page, title);
  await row.waitFor({ state: "visible", timeout: 5_000 });
  await row.click();
}

/**
 * Click the chevron button on the first row matching `title` to open its
 * EditorDrawer inline. Returns the drawer locator for further assertions.
 */
export async function openEditorForTitle(page: Page, title: string | RegExp) {
  const row = findRowByTitle(page, title);
  await row.waitFor({ state: "visible", timeout: 5_000 });
  await row.locator('[data-testid="row-chevron"]').click();
  const drawer = page.getByTestId("editor-drawer");
  await drawer.waitFor({ state: "visible", timeout: 5_000 });
  return drawer;
}

/** Toggle the selection checkbox on the first row matching `title`. */
export async function toggleRowSelection(page: Page, title: string | RegExp) {
  const row = findRowByTitle(page, title);
  await row.waitFor({ state: "visible", timeout: 5_000 });
  await row.locator('[data-testid="row-checkbox"]').click();
}
