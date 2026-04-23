import { test, expect, waitForSignalFlow } from "./fixtures";

test("footer Detections accordion is non-empty and expands to show example files", async ({
  page,
}) => {
  await waitForSignalFlow(page);

  const accordion = page.getByTestId("detections-accordion");
  await expect(accordion).toBeVisible();

  // Collapsed by default — toggle text starts with '▸' and mentions a
  // non-zero convention count.
  const toggle = page.getByTestId("detections-toggle");
  await expect(toggle).toContainText(/▸/);
  await expect(toggle).toContainText(/Detections/);
  await expect(toggle).toContainText(/[1-9]\d* convention/);

  // Open it.
  await toggle.click();
  await expect(accordion).toHaveAttribute("data-open", "true");
  await expect(toggle).toContainText(/▾/);

  // At least one convention row renders.
  const conventions = page.getByTestId("detection-convention");
  expect(await conventions.count()).toBeGreaterThan(0);

  // Expanding the first convention reveals an examples list.
  const first = conventions.first();
  const conventionKey = await first.getAttribute("data-convention");
  expect(conventionKey).toBeTruthy();
  await page.getByTestId(`detection-toggle-${conventionKey}`).click();
  await expect(first).toHaveAttribute("data-expanded", "true");
  const examples = page.getByTestId(`detection-examples-${conventionKey}`);
  await expect(examples).toBeVisible();
});
