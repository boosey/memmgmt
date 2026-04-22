#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest) {
  if (!(await exists(src))) return;
  await fs.cp(src, dest, { recursive: true });
}

async function main() {
  if (!(await exists(standaloneDir))) return;
  await copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
  await copyDir(
    path.join(root, ".next", "static"),
    path.join(standaloneDir, ".next", "static"),
  );
}

main().catch((e) => {
  console.error("copy-standalone-assets failed:", e);
  process.exit(1);
});
