import fs from "node:fs/promises";
import { computeDiff } from "./diff";
import type {
  DiffHunk,
  SavePreviewRequest,
  SavePreviewResponse,
} from "../apiContracts";

const MTIME_TOLERANCE_MS = 1;

// Simulate `applyEdit` without touching disk: validate the file is still in
// the expected state, then compute the diff against nextContent. Lets the
// Preview-diff modal render before the user commits to a save.
export async function previewDiff(
  req: SavePreviewRequest,
): Promise<SavePreviewResponse> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(req.sourceFile);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        ok: false,
        reason: "file-missing",
        message: `source file not found: ${req.sourceFile}`,
      };
    }
    return {
      ok: false,
      reason: "internal",
      message: err.message,
    };
  }

  if (Math.abs(stat.mtimeMs - req.expectedMtimeMs) > MTIME_TOLERANCE_MS) {
    return {
      ok: false,
      reason: "mtime-drift",
      message: `expected mtime ${req.expectedMtimeMs} but saw ${stat.mtimeMs}`,
    };
  }

  let before: string;
  try {
    before = await fs.readFile(req.sourceFile, "utf8");
  } catch (e) {
    return {
      ok: false,
      reason: "read-failed",
      message: (e as Error).message,
    };
  }

  const after = req.nextContent;
  const diff = computeDiff(before, after);
  const hunks: DiffHunk[] = diffToHunks(before, after, diff.raw);

  return {
    ok: true,
    before,
    after,
    hunks,
    noop: diff.noop,
  };
}

// Convert the raw Change[] stream from the `diff` library into the shape
// SavePreviewResponse expects: each contiguous added/removed run becomes one
// DiffHunk, tagged with its line offsets in before/after.
function diffToHunks(
  before: string,
  after: string,
  raw: import("diff").Change[],
): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let beforeLine = 0;
  let afterLine = 0;
  let i = 0;
  while (i < raw.length) {
    const c = raw[i]!;
    if (!c.added && !c.removed) {
      beforeLine += c.count ?? 0;
      afterLine += c.count ?? 0;
      i++;
      continue;
    }
    const hunkBeforeStart = beforeLine;
    const hunkAfterStart = afterLine;
    const beforeLines: string[] = [];
    const afterLines: string[] = [];
    // Collapse consecutive added/removed chunks into one hunk.
    while (i < raw.length && (raw[i]!.added || raw[i]!.removed)) {
      const chunk = raw[i]!;
      const lines = splitKeepLines(chunk.value);
      if (chunk.removed) {
        beforeLines.push(...lines);
        beforeLine += chunk.count ?? lines.length;
      } else if (chunk.added) {
        afterLines.push(...lines);
        afterLine += chunk.count ?? lines.length;
      }
      i++;
    }
    hunks.push({
      beforeStart: hunkBeforeStart,
      beforeLines,
      afterStart: hunkAfterStart,
      afterLines,
    });
  }
  // Reference `before` / `after` for future callers that want to sanity-check
  // hunk extents without re-reading the file; they live on the response.
  void before;
  void after;
  return hunks;
}

// Split a multi-line diff chunk into individual lines without trailing '\n'.
// A trailing empty string from a final newline is dropped — hunks are
// line-counted, not byte-counted.
function splitKeepLines(s: string): string[] {
  if (s === "") return [];
  const parts = s.split("\n");
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}
