import type { Entity } from "@/core/entities";

// Pure function: given an Entity, return the absolute filesystem path
// where edits to this entity will be written. Drives the RightRail's
// "Writes to" block.
//
// For existing entities with stable filenames, this is just sourceFile.
// For entities whose path is a function of a renameable field (skill name,
// command name, agent name), callers can pass an override to preview the
// post-save path.

export interface DescribePathOverrides {
  /** Override the entity's title (skill/command/agent name) for rename preview. */
  title?: string;
}

export function describePath(
  entity: Entity,
  overrides: DescribePathOverrides = {},
): string {
  if (!overrides.title) return entity.sourceFile;

  const nextTitle = overrides.title;
  switch (entity.type) {
    case "skill":
    case "agent":
    case "command": {
      // Replace the last path segment stem with nextTitle, preserve extension.
      const sep = entity.sourceFile.includes("\\") ? "\\" : "/";
      const parts = entity.sourceFile.split(sep);
      const basename = parts[parts.length - 1] ?? "";
      const ext = basename.includes(".")
        ? basename.slice(basename.lastIndexOf("."))
        : "";
      // Commands may have leading slash like "/ship" -> strip before using.
      const cleanTitle = nextTitle.replace(/^\/+/, "");
      parts[parts.length - 1] = `${cleanTitle}${ext}`;
      return parts.join(sep);
    }
    default:
      // settings-backed entities (permission, hook, env, mcp-server, keybinding)
      // and multi-entry files (standing-instruction in CLAUDE.md, memory index)
      // all write back to their existing sourceFile — renaming them doesn't
      // move the file.
      return entity.sourceFile;
  }
}
