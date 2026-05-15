// Factory for synthetic "blank" entities used by the +Add creation flow.
//
// A blank entity is recognised by its id prefix `new:` and (for new files)
// mtimeMs === 0. RightRail.handleSave inspects the id prefix to decide
// whether to send expectedMtimeMs to /api/save — when omitted, the server
// treats the request as a create.
//
// When adding an entry to a file that already exists (e.g. another permission
// in an existing settings.json), the caller passes an existing entity so we
// can inherit its rawContent + mtimeMs and the builder can splice the new
// entry into the live JSON.

import type {
  AuthorBucket,
  Entity,
  EntityType,
  Scope,
} from "@/core/entities";

export interface BlankEntityInput {
  type: EntityType;
  scope: Scope;
  scopeRoot: string;
  sourceFile: string;
  /** When adding to an existing file, copy its content + mtime so the
   * builder can splice the new entry. Omit for true new-file creation. */
  existing?: { rawContent: string; mtimeMs: number } | undefined;
  /** Optional pre-fill, e.g. a default permission group. */
  structured?: unknown;
  /** Optional slug ref (memory only). */
  slugRef?: string;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `new:${Date.now()}:${counter}`;
}

export function createBlankEntity(inp: BlankEntityInput): Entity {
  const author: AuthorBucket = "you";
  const rawContent = inp.existing?.rawContent ?? defaultRawContent(inp.type, inp.sourceFile);
  const mtimeMs = inp.existing?.mtimeMs ?? 0;
  const e: Entity = {
    id: nextId(),
    type: inp.type,
    scope: inp.scope,
    author,
    title: "",
    intent: "",
    sourceFile: inp.sourceFile,
    scopeRoot: inp.scopeRoot,
    mtimeMs,
    rawContent,
  };
  if (inp.structured !== undefined) e.structured = inp.structured;
  if (inp.slugRef) e.slugRef = inp.slugRef;
  return e;
}

export function isBlankEntity(e: Entity): boolean {
  return e.id.startsWith("new:");
}

/** Slug for filenames/dir-names. Strips path separators and most punctuation,
 * collapses whitespace to dashes. Preserves case. */
export function slugifyName(name: string): string {
  return name
    .trim()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[^A-Za-z0-9_.\-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "");
}

/** For file-per-entity types (skill/command/memory), swap the placeholder
 * slug in entity.sourceFile with the slugified Name input. AddNewButton
 * embeds "__new__" as the placeholder when constructing the blank entity. */
export function deriveSourceFileFromName(
  sourceFile: string,
  name: string,
): string {
  const slug = slugifyName(name);
  if (!slug) return sourceFile;
  return sourceFile.replace("__new__", slug);
}

function defaultRawContent(type: EntityType, sourceFile: string): string {
  // Settings-based types live in JSON files.
  if (
    type === "permission" ||
    type === "hook" ||
    type === "env" ||
    type === "mcp-server" ||
    type === "enabled-plugins"
  ) {
    return "{}\n";
  }
  // Keybindings file is JSON.
  if (type === "keybinding") return "{}\n";
  // CLAUDE.md / AGENTS.md sections live in markdown.
  if (type === "standing-instruction") return "";
  // File-per-entity types start empty; serializers produce the full file.
  if (
    type === "skill" ||
    type === "command" ||
    type === "agent" ||
    type === "memory"
  ) {
    return "";
  }
  // Fallback by extension.
  if (sourceFile.endsWith(".json")) return "{}\n";
  return "";
}
