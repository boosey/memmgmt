// v1.7 API contracts — request/response shapes for the new editor flow.
// backend-track implements; ui-track consumes. Locked contracts.

import type { Entity, EntityType, Scope } from "./entities";

// ── /api/save/preview ───────────────────────────────────────────────────────
// Takes the same input as /api/save but writes nothing. Returns before/after
// + diff hunks for the Preview-diff modal.

export interface SavePreviewRequest {
  sourceFile: string;
  scopeRoot: string;
  nextContent: string;
  expectedMtimeMs: number;
}

export interface DiffHunk {
  /** 0-indexed line number in the before text where this hunk starts. */
  beforeStart: number;
  beforeLines: string[];
  /** 0-indexed line number in the after text. */
  afterStart: number;
  afterLines: string[];
}

export type SavePreviewResponse =
  | {
      ok: true;
      before: string;
      after: string;
      hunks: DiffHunk[];
      /** True when before === after (no change to preview). */
      noop: boolean;
    }
  | {
      ok: false;
      reason: "mtime-drift" | "file-missing" | "read-failed" | "internal";
      message: string;
    };

// ── /api/convert-to-skill ──────────────────────────────────────────────────
// File-layer transaction:
//   1. Back up the command file.
//   2. Write the new skill file with the command's body verbatim.
//   3. Delete the command file.
//   4. Rewrite `provides` relations in the next graph build.
//
// Invocation: from the CommandEditor's Convert-to-Skill flow. Requires
// confirmation in the UI; backend assumes the user has confirmed.

export interface ConvertToSkillRequest {
  commandId: string;           // source command Entity.id
  newSkillName: string;        // must be a valid folder/file slug
  newSkillDescription: string; // goes into frontmatter `description`
}

export interface ConvertToSkillSuccess {
  ok: true;
  skillPath: string;           // absolute path written
  commandBackupPath: string;   // absolute path of the backup copy
  commandDeletedPath: string;  // absolute path of the removed command
  /** Entity.id the new skill will have on the next graph build. */
  newSkillId: string;
}

export type ConvertToSkillResponse =
  | ConvertToSkillSuccess
  | {
      ok: false;
      reason:
        | "command-not-found"
        | "skill-name-invalid"
        | "skill-name-taken"
        | "write-failed"
        | "backup-failed"
        | "delete-failed"
        | "internal";
      message: string;
    };

// ── /api/bulk ──────────────────────────────────────────────────────────────
// Dispatcher for multi-entity operations from BulkActionBar.

export type BulkAction =
  | "resolve-to-winner"     // for each contested entity: keep winner, delete shadowed
  | "delete-shadowed"        // delete only non-winner copies
  | "promote-scope"          // move each entity one scope level higher
  | "demote-scope"           // move each entity one scope level lower
  | "dismiss-stale"          // suppress stale flag on memory entities
  | "flag-for-review"        // mark warn-eligible entities for manual review
  | "delete-entity";         // delete ALL scope copies (requires confirmation)

export interface BulkRequest {
  action: BulkAction;
  entityIds: string[];
  /** Client must set this for `delete-entity` to proceed. */
  confirm?: boolean;
}

export interface BulkAffected {
  entityId: string;
  sourceFile: string;
  /** Populated when the operation wrote a backup before acting. */
  backupPath?: string;
  /** For scope moves: the new sourceFile after the move. */
  newSourceFile?: string;
  /** For dismiss-stale / flag-for-review: the marker file touched. */
  markerFile?: string;
}

export type BulkResponse =
  | {
      ok: true;
      action: BulkAction;
      affected: BulkAffected[];
    }
  | {
      ok: false;
      action: BulkAction;
      reason:
        | "confirmation-required"
        | "entity-missing"
        | "action-not-applicable"
        | "write-failed"
        | "partial-failure"
        | "internal";
      message: string;
      /** When `reason === 'partial-failure'`, entries that succeeded before the first error. */
      partiallyAffected?: BulkAffected[];
    };

// ── Derived helpers for UI ─────────────────────────────────────────────────

/** Which bulk actions are applicable given a selection's composition. */
export interface BulkApplicability {
  hasContested: boolean;
  hasStale: boolean;
  hasUnknownAuthor: boolean;
  count: number;
}

export function applicableBulkActions(a: BulkApplicability): BulkAction[] {
  const actions: BulkAction[] = [];
  if (a.count === 0) return actions;
  if (a.hasContested) actions.push("resolve-to-winner", "delete-shadowed");
  actions.push("promote-scope", "demote-scope");
  if (a.hasStale) actions.push("dismiss-stale");
  if (a.hasUnknownAuthor) actions.push("flag-for-review");
  actions.push("delete-entity");
  return actions;
}

// ── Scope move helpers (for ScopeMover) ────────────────────────────────────

export const SCOPE_LADDER: readonly Scope[] = [
  "global",
  "plugin",
  "slug",
  "project",
  "local",
] as const;

export function scopeAbove(s: Scope): Scope | null {
  const i = SCOPE_LADDER.indexOf(s);
  return i > 0 ? SCOPE_LADDER[i - 1]! : null;
}

export function scopeBelow(s: Scope): Scope | null {
  const i = SCOPE_LADDER.indexOf(s);
  return i >= 0 && i < SCOPE_LADDER.length - 1
    ? SCOPE_LADDER[i + 1]!
    : null;
}

// ── Re-exports so consumers don't need to import from two places ───────────

export type { Entity, EntityType, Scope };
