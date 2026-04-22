import os from "node:os";
import path from "node:path";

export interface HomePaths {
  claudeHome: string;
  projectsDir: string;
  pluginsDir: string;
  backupsDir: string;
  viewPrefsFile: string;
}

export function resolveHomePaths(overrideHome?: string): HomePaths {
  const home = overrideHome ?? os.homedir();
  const claudeHome = path.join(home, ".claude");
  return {
    claudeHome,
    projectsDir: path.join(claudeHome, "projects"),
    pluginsDir: path.join(claudeHome, "plugins"),
    backupsDir: path.join(claudeHome, "memmgmt-backups"),
    viewPrefsFile: path.join(claudeHome, "memmgmt-settings.json"),
  };
}
