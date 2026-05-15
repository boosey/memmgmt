import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { applyEdit } from "@/core/save/writer";
import { restoreLastBackup } from "@/core/save/undo";

let tmp: string;
let src: string;
let backupsDir: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "the-memory-register-w-"));
  src = path.join(tmp, "CLAUDE.md");
  await fs.writeFile(src, "old\n", "utf8");
  backupsDir = path.join(tmp, "backups");
});

describe("applyEdit", () => {
  it("backs up and writes new content", async () => {
    const mtime = (await fs.stat(src)).mtimeMs;
    const res = await applyEdit({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "new\n",
      expectedMtimeMs: mtime,
    });
    expect(res.ok).toBe(true);
    expect(await fs.readFile(src, "utf8")).toBe("new\n");
  });

  it("refuses write when mtime mismatches", async () => {
    const res = await applyEdit({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "new\n",
      expectedMtimeMs: 0,
    });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("mtime-mismatch");
  });

  it("returns noop when next matches current", async () => {
    const mtime = (await fs.stat(src)).mtimeMs;
    const res = await applyEdit({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "old\n",
      expectedMtimeMs: mtime,
    });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("noop");
  });

  // Regression: "Save as New" used to send expectedMtimeMs=undefined, which
  // JSON.stringify dropped, so the route schema (required number) rejected
  // it with 400 "invalid body". The schema now permits omission as a signal
  // to create — applyEdit must accept it and skip the mtime check.
  it("creates a new file when expectedMtimeMs is omitted", async () => {
    const target = path.join(tmp, "subdir", "new-file.md");
    const res = await applyEdit({
      sourceFile: target,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "fresh\n",
      // expectedMtimeMs intentionally omitted
    });
    expect(res.ok).toBe(true);
    expect(res.ok === true && res.backupPath).toBeNull();
    expect(await fs.readFile(target, "utf8")).toBe("fresh\n");
  });

  it("writes without mtime check when expectedMtimeMs is omitted on an existing file", async () => {
    // Existing file with current content; caller did not pass an mtime.
    // Used by the +Add flow when appending an entry to a file we already
    // know the rawContent of (mtime check is implicit via the inherited
    // rawContent the editor builds against).
    const res = await applyEdit({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "updated\n",
      // expectedMtimeMs intentionally omitted
    });
    expect(res.ok).toBe(true);
    expect(res.ok === true && res.backupPath).not.toBeNull();
    expect(await fs.readFile(src, "utf8")).toBe("updated\n");
  });
});

describe("restoreLastBackup", () => {
  it("rolls back to previous contents", async () => {
    const mtime0 = (await fs.stat(src)).mtimeMs;
    await applyEdit({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
      nextContent: "new\n",
      expectedMtimeMs: mtime0,
    });
    const r = await restoreLastBackup({
      sourceFile: src,
      scopeRoot: tmp,
      backupsDir,
    });
    expect(r.ok).toBe(true);
    expect(await fs.readFile(src, "utf8")).toBe("old\n");
  });
});
