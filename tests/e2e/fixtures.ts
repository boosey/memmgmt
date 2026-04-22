import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend({});
export { expect };

/** Wait for the inventory view to be fully populated. */
export async function waitForInventory(page: Page) {
  await page.goto("/");
  // Scope column headings render once the graph has loaded.
  await page
    .getByRole("heading", { name: /^Global/i })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  // Wait for at least one artifact card button to render in any column.
  await page.locator("section button").first().waitFor({ timeout: 10_000 });
}

/** Click the first artifact card whose title matches (substring or regex). */
export async function clickCardByTitle(page: Page, titleSubstring: string | RegExp) {
  const card = page.locator("section button", { hasText: titleSubstring }).first();
  await card.click();
}

/** Switch to the graph tab and wait for the React Flow canvas to populate. */
export async function switchToGraph(page: Page) {
  await page.getByRole("button", { name: /^graph$/i }).click();
  await page.locator(".react-flow__node").first().waitFor({ timeout: 10_000 });
}
