import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { dispatchBulk } from "@/core/save/bulkOps";
import type { Entity } from "@/core/entities";

let tmp: string;
let backupsDir: string;
let claudeHome: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "memmgmt-bk-"));
  backupsDir = path.join(tmp, "backups");
  claudeHome = path.join(tmp, ".claude");
  await fs.mkdir(claudeHome, { recursive: true });
});

async function writeFileFixture(abs: string, content = "x\n"): Promise<void> {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
}

function skillEntity(
  scope: Entity["scope"],
  sourceFile: string,
  scopeRoot: string,
  name: string,
  id: string,
): Entity {
  return {
    id,
    type: "skill",
    scope,
    author: "you",
    title: name,
    intent: "",
    identity: `skill::${name}`,
    sourceFile,
    scopeRoot,
    mtimeMs: 0,
    rawContent: "",
  };
}

function memoryEntity(
  scope: Entity["scope"],
  sourceFile: string,
  scopeRoot: string,
  id: string,
): Entity {
  return {
    id,
    type: "memory",
    scope,
    author: "you",
    title: path.basename(sourceFile),
    intent: "",
    slugRef: "my-project",
    sourceFile,
    scopeRoot,
    mtimeMs: 0,
    rawContent: "",
  };
}

describe("dispatchBulk — resolve-to-winner", () => {
  it("deletes shadowed copies and keeps the highest-scope winner", async () => {
    const globalFile = path.join(claudeHome, "skills", "ship", "SKILL.md");
    const projRoot = path.join(tmp, "projA");
    const projFile = path.join(projRoot, ".claude", "skills", "ship", "SKILL.md");
    await writeFileFixture(globalFile, "global\n");
    await writeFileFixture(projFile, "project\n");

    const ents = [
      skillEntity("global", globalFile, claudeHome, "ship", "g1"),
      skillEntity("project", projFile, projRoot, "ship", "p1"),
    ];

    const res = await dispatchBulk(
      { action: "resolve-to-winner", entityIds: ["g1"] },
      { backupsDir, claudeHome, knownEntities: ents },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.affected.length).toBe(1);
    // Global (loser) gone; project (winner) preserved.
    await expect(fs.stat(globalFile)).rejects.toBeTruthy();
    expect(await fs.readFile(projFile, "utf8")).toBe("project\n");
  });
});

describe("dispatchBulk — delete-shadowed", () => {
  it("removes non-winners without touching the winner", async () => {
    const globalFile = path.join(claudeHome, "skills", "x", "SKILL.md");
    const projRoot = path.join(tmp, "p");
    const projFile = path.join(projRoot, ".claude", "skills", "x", "SKILL.md");
    await writeFileFixture(globalFile);
    await writeFileFixture(projFile, "winner\n");
    const ents = [
      skillEntity("global", globalFile, claudeHome, "x", "a"),
      skillEntity("project", projFile, projRoot, "x", "b"),
    ];
    const res = await dispatchBulk(
      { action: "delete-shadowed", entityIds: ["a"] },
      { backupsDir, claudeHome, knownEntities: ents },
    );
    expect(res.ok).toBe(true);
    await expect(fs.stat(globalFile)).rejects.toBeTruthy();
    expect(await fs.readFile(projFile, "utf8")).toBe("winner\n");
  });
});

describe("dispatchBulk — promote-scope / demote-scope", () => {
  it("refuses to promote an entity at the top of the ladder", async () => {
    const gFile = path.join(claudeHome, "skills", "s", "SKILL.md");
    await writeFileFixture(gFile);
    const ent = skillEntity("global", gFile, claudeHome, "s", "g");
    const res = await dispatchBulk(
      { action: "promote-scope", entityIds: ["g"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("action-not-applicable");
  });

  it("refuses to demote an entity at the bottom of the ladder", async () => {
    const f = path.join(tmp, "p", ".claude", "skills", "s", "SKILL.md");
    await writeFileFixture(f);
    const ent = skillEntity("local", f, path.join(tmp, "p"), "s", "L");
    const res = await dispatchBulk(
      { action: "demote-scope", entityIds: ["L"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("action-not-applicable");
  });

  it("promotes a plugin skill to global scope", async () => {
    const pluginRoot = path.join(tmp, "plugins", "foo");
    const pluginFile = path.join(pluginRoot, "skills", "bar", "SKILL.md");
    await writeFileFixture(pluginFile, "content\n");
    const ent = skillEntity("plugin", pluginFile, pluginRoot, "bar", "pk1");
    const res = await dispatchBulk(
      { action: "promote-scope", entityIds: ["pk1"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const newPath = res.affected[0]!.newSourceFile!;
    expect(newPath).toBe(path.join(claudeHome, "skills", "bar", "SKILL.md"));
    expect(await fs.readFile(newPath, "utf8")).toBe("content\n");
    await expect(fs.stat(pluginFile)).rejects.toBeTruthy();
  });

  it("refuses to scope-move an entity type without a file-per-entity layout", async () => {
    const f = path.join(tmp, "settings.json");
    await writeFileFixture(f, "{}\n");
    const ent: Entity = {
      id: "perm1",
      type: "permission",
      scope: "project",
      author: "you",
      title: "Bash(*)",
      intent: "",
      sourceFile: f,
      scopeRoot: tmp,
      mtimeMs: 0,
      rawContent: "",
    };
    const res = await dispatchBulk(
      { action: "promote-scope", entityIds: ["perm1"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("action-not-applicable");
  });
});

describe("dispatchBulk — dismiss-stale", () => {
  it("writes a marker to memmgmt-state.json", async () => {
    const memPath = path.join(tmp, "mem.md");
    await writeFileFixture(memPath);
    const ent = memoryEntity("slug", memPath, path.dirname(memPath), "m1");
    const res = await dispatchBulk(
      { action: "dismiss-stale", entityIds: ["m1"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const marker = res.affected[0]!.markerFile!;
    const state = JSON.parse(await fs.readFile(marker, "utf8"));
    expect(state.dismissedStale).toHaveLength(1);
    expect(state.dismissedStale[0].entityId).toBe("m1");
  });
});

describe("dispatchBulk — flag-for-review", () => {
  it("writes a flaggedForReview marker", async () => {
    const f = path.join(tmp, "thing.md");
    await writeFileFixture(f);
    const ent: Entity = {
      id: "e1",
      type: "skill",
      scope: "plugin",
      author: "unknown",
      title: "thing",
      intent: "",
      sourceFile: f,
      scopeRoot: tmp,
      mtimeMs: 0,
      rawContent: "",
    };
    const res = await dispatchBulk(
      { action: "flag-for-review", entityIds: ["e1"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const marker = res.affected[0]!.markerFile!;
    const state = JSON.parse(await fs.readFile(marker, "utf8"));
    expect(state.flaggedForReview).toHaveLength(1);
  });
});

describe("dispatchBulk — delete-entity", () => {
  it("requires confirm:true", async () => {
    const f = path.join(tmp, "s.md");
    await writeFileFixture(f);
    const ent = skillEntity("global", f, tmp, "s", "s1");
    const res = await dispatchBulk(
      { action: "delete-entity", entityIds: ["s1"] },
      { backupsDir, claudeHome, knownEntities: [ent] },
    );
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("confirmation-required");
    expect(await fs.readFile(f, "utf8")).toBe("x\n");
  });

  it("deletes all scope copies when confirmed", async () => {
    const a = path.join(tmp, "a.md");
    const b = path.join(tmp, "b.md");
    await writeFileFixture(a);
    await writeFileFixture(b);
    const ents = [
      skillEntity("global", a, tmp, "same", "a"),
      skillEntity("project", b, tmp, "same", "b"),
    ];
    const res = await dispatchBulk(
      { action: "delete-entity", entityIds: ["a"], confirm: true },
      { backupsDir, claudeHome, knownEntities: ents },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.affected.length).toBe(2);
    await expect(fs.stat(a)).rejects.toBeTruthy();
    await expect(fs.stat(b)).rejects.toBeTruthy();
  });
});
