import fs from "node:fs/promises";
import path from "node:path";

export interface BackupInput {
  sourceFile: string;
  scopeRoot: string;
  backupsDir: string;
}

export interface BackupResult {
  backupPath: string;
  timestamp: string;
}

export async function createBackup(inp: BackupInput): Promise<BackupResult> {
  // Keep milliseconds to avoid same-second collisions when multiple backups land rapidly.
  const ts = new Date().toISOString().replace(/:/g, "-").replace(/\./g, "-");
  const rel =
    path.relative(inp.scopeRoot, inp.sourceFile) ||
    path.basename(inp.sourceFile);
  const dest = path.join(inp.backupsDir, ts, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(inp.sourceFile, dest);
  return { backupPath: dest, timestamp: ts };
}

export async function listBackups(
  backupsDir: string,
  sourceFile: string,
  scopeRoot: string,
): Promise<string[]> {
  const rel =
    path.relative(scopeRoot, sourceFile) || path.basename(sourceFile);
  const timestamps = await fs.readdir(backupsDir).catch(() => []);
  const matches: string[] = [];
  for (const ts of timestamps) {
    const p = path.join(backupsDir, ts, rel);
    try {
      await fs.stat(p);
      matches.push(p);
    } catch {
      /* ignore */
    }
  }
  return matches.sort();
}
