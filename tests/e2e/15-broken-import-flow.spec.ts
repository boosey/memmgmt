import { test, expect, waitForSignalFlow } from "./fixtures";
import fs from "node:fs/promises";
import path from "node:path";

const FIXTURE = path.resolve(process.cwd(), "tests/fixtures/sample-claude-home");
const CLAUDE_FILE = path.join(FIXTURE, "CLAUDE.md");
const CREATED_FILE = path.join(FIXTURE, "new-file.md");

test("broken-import resolution flow → create missing file", async ({ page }) => {
  const originalClaude = await fs.readFile(CLAUDE_FILE, "utf8");
  // Add a broken import
  const brokenClaude = originalClaude + "\n\n## Broken\n@./new-file.md\n";
  await fs.writeFile(CLAUDE_FILE, brokenClaude, "utf8");

  try {
    // Wait for refresh
    await new Promise((r) => setTimeout(r, 5200));
    await waitForSignalFlow(page);

    // Find the broken pill
    const pill = page.locator('[data-testid="relation-pill"][data-broken="true"]').first();
    await expect(pill).toBeVisible();
    await pill.click();

    // Modal should appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Resolve Broken Import");

    // Click "Create missing file"
    await modal.getByRole("button", { name: /create missing file/i }).click();

    // Modal should close and file should exist
    await expect(modal).not.toBeVisible();
    const exists = await fs.access(CREATED_FILE).then(() => true).catch(() => false);
    expect(exists).toBe(true);

  } finally {
    await fs.writeFile(CLAUDE_FILE, originalClaude, "utf8");
    await fs.rm(CREATED_FILE, { force: true });
  }
});

test("broken-import resolution flow → remove import", async ({ page }) => {
  const originalClaude = await fs.readFile(CLAUDE_FILE, "utf8");
  const brokenClaude = originalClaude + "\n\n## Broken\n@./to-remove.md\n";
  await fs.writeFile(CLAUDE_FILE, brokenClaude, "utf8");

  try {
    await new Promise((r) => setTimeout(r, 5200));
    await waitForSignalFlow(page);

    const pill = page.locator('[data-testid="relation-pill"][data-broken="true"]').first();
    await pill.click();

    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: /remove import/i }).click();

    await expect(modal).not.toBeVisible();
    
    // Check file content — the @ reference should be gone
    const after = await fs.readFile(CLAUDE_FILE, "utf8");
    expect(after).not.toContain("@./to-remove.md");

  } finally {
    await fs.writeFile(CLAUDE_FILE, originalClaude, "utf8");
  }
});
