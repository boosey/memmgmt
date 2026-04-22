import { diffLines, type Change } from "diff";

export interface DiffHunk {
  added: number;
  removed: number;
  changes: Change[];
}

export interface DiffResult {
  noop: boolean;
  hunks: DiffHunk[];
  raw: Change[];
}

export function computeDiff(before: string, after: string): DiffResult {
  const raw = diffLines(before, after);
  const anyChange = raw.some((c) => c.added || c.removed);
  const hunks: DiffHunk[] = anyChange
    ? [
        {
          added: raw
            .filter((c) => c.added)
            .reduce((n, c) => n + (c.count ?? 0), 0),
          removed: raw
            .filter((c) => c.removed)
            .reduce((n, c) => n + (c.count ?? 0), 0),
          changes: raw,
        },
      ]
    : [];
  return { noop: !anyChange, hunks, raw };
}
