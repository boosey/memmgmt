import fs from "node:fs/promises";
import path from "node:path";
import { createBackup } from "./backup";
import { computeDiff, type DiffResult } from "./diff";

export interface ApplyEditInput {
  sourceFile: string;
  scopeRoot: string;
  backupsDir: string;
  nextContent: string;
  /** Omit to signal a new-file create (no mtime check; parent dirs are created). */
  expectedMtimeMs?: number | undefined;
}

export type ApplyEditResult =
  | {
      ok: true;
      diff: DiffResult;
      backupPath: string | null;
      newMtimeMs: number;
    }
  | {
      ok: false;
      reason: "mtime-mismatch" | "noop" | "io-error";
      message?: string;
    };

const MTIME_TOLERANCE_MS = 1;

export async function applyEdit(
  inp: ApplyEditInput,
): Promise<ApplyEditResult> {
  const isCreate = inp.expectedMtimeMs === undefined;
  try {
    let before = "";
    let fileExists = true;
    try {
      const stat = await fs.stat(inp.sourceFile);
      if (
        !isCreate &&
        Math.abs(stat.mtimeMs - (inp.expectedMtimeMs as number)) >
          MTIME_TOLERANCE_MS
      ) {
        return { ok: false, reason: "mtime-mismatch" };
      }
      before = await fs.readFile(inp.sourceFile, "utf8");
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT" && isCreate) {
        fileExists = false;
      } else {
        throw e;
      }
    }

    if (before === inp.nextContent) return { ok: false, reason: "noop" };

    let backupPath: string | null = null;
    if (fileExists) {
      const backup = await createBackup({
        sourceFile: inp.sourceFile,
        scopeRoot: inp.scopeRoot,
        backupsDir: inp.backupsDir,
      });
      backupPath = backup.backupPath;
    } else {
      await fs.mkdir(path.dirname(inp.sourceFile), { recursive: true });
    }

    await fs.writeFile(inp.sourceFile, inp.nextContent, "utf8");
    const newStat = await fs.stat(inp.sourceFile);
    return {
      ok: true,
      diff: computeDiff(before, inp.nextContent),
      backupPath,
      newMtimeMs: newStat.mtimeMs,
    };
  } catch (e) {
    return { ok: false, reason: "io-error", message: (e as Error).message };
  }
}
