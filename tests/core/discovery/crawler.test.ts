import { describe, it, expect } from "vitest";
import path from "node:path";
import { crawl } from "@/core/discovery/crawler";

const FIXTURE = path.resolve(__dirname, "../../fixtures/sample-claude-home");
const FIXTURE_PROJECT = path.resolve(FIXTURE, ".fixture-project");

describe("crawler", () => {
  it("discovers global CLAUDE.md, settings.json, keybindings, skills, commands, memory, plugin manifest", async () => {
    const { raws } = await crawl({
      claudeHome: FIXTURE,
      knownProjectPaths: [FIXTURE_PROJECT],
    });

    const kinds = new Set(raws.map((r) => r.kind));
    expect(kinds).toContain("claude-md-section");
    expect(kinds).toContain("settings-entry");
    expect(kinds).toContain("keybindings");
    expect(kinds).toContain("skill");
    expect(kinds).toContain("slash-command");
    expect(kinds).toContain("plugin-manifest");
    expect(kinds).toContain("typed-memory");
    expect(kinds).toContain("memory-index-entry");
  });

  it("marks slugs with missing project dirs as ghost slugs", async () => {
    const { ghostSlugs } = await crawl({
      claudeHome: FIXTURE,
      knownProjectPaths: [FIXTURE_PROJECT],
    });
    expect(ghostSlugs.some((g) => g.slug.includes("dead"))).toBe(true);
  });

  it("assigns scope=local to CLAUDE.local.md", async () => {
    const { raws } = await crawl({
      claudeHome: FIXTURE,
      knownProjectPaths: [FIXTURE_PROJECT],
    });
    const localClaudeMd = raws.find(
      (r) =>
        r.kind === "claude-md-section" &&
        r.sourceFile.endsWith("CLAUDE.local.md"),
    );
    expect(localClaudeMd?.scope).toBe("local");
  });

  it("assigns scope=local to settings.local.json", async () => {
    const { raws } = await crawl({
      claudeHome: FIXTURE,
      knownProjectPaths: [FIXTURE_PROJECT],
    });
    const localSettings = raws.find(
      (r) =>
        r.kind === "settings-entry" &&
        r.sourceFile.endsWith("settings.local.json"),
    );
    expect(localSettings?.scope).toBe("local");
  });

  it("tracks slug metadata (session count + last active)", async () => {
    const { slugMetadata } = await crawl({
      claudeHome: FIXTURE,
      knownProjectPaths: [FIXTURE_PROJECT],
    });
    const live = slugMetadata.find((s) => s.slug === "-tmp-fx-proj");
    expect(live?.sessionCount).toBe(1);
    expect(live?.lastActiveMs).toBeGreaterThan(0);
  });
});
