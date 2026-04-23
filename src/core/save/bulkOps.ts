import fs from "node:fs/promises";
import path from "node:path";
import { createBackup } from "./backup";
import type { Entity, Scope } from "../entities";
import { SCOPE_PRECEDENCE } from "../entities";
import {
  scopeAbove,
  scopeBelow,
  type BulkAffected,
  type BulkRequest,
  type BulkResponse,
} from "../apiContracts";

export interface BulkContext {
  /** Root for persistent backups. */
  backupsDir: string;
  /** Snapshot of current entities; used for identity-group lookups + scope math. */
  knownEntities: Entity[];
  /** Resolved Claude home (~/.claude). Used to locate memmgmt-state.json. */
  claudeHome: string;
}

// ── Public dispatcher ──────────────────────────────────────────────────────

export async function dispatchBulk(
  req: BulkRequest,
  ctx: BulkContext,
): Promise<BulkResponse> {
  try {
    switch (req.action) {
      case "resolve-to-winner":
      case "delete-shadowed":
        return await runDeleteShadowed(req, ctx);
      case "promote-scope":
        return await runScopeMove(req, ctx, "up");
      case "demote-scope":
        return await runScopeMove(req, ctx, "down");
      case "dismiss-stale":
        return await runMarker(req, ctx, "dismissedStale");
      case "flag-for-review":
        return await runMarker(req, ctx, "flaggedForReview");
      case "delete-entity":
        if (req.confirm !== true) {
          return {
            ok: false,
            action: req.action,
            reason: "confirmation-required",
            message: "confirm:true required for delete-entity",
          };
        }
        return await runDeleteEntity(req, ctx);
    }
  } catch (e) {
    return {
      ok: false,
      action: req.action,
      reason: "internal",
      message: (e as Error).message,
    };
  }
}

// ── resolve-to-winner / delete-shadowed ────────────────────────────────────
// Shared implementation. Both actions keep the highest-precedence scope copy
// of each identity group; neither touches identities that aren't contested.

async function runDeleteShadowed(
  req: BulkRequest,
  ctx: BulkContext,
): Promise<BulkResponse> {
  const affected: BulkAffected[] = [];
  for (const id of req.entityIds) {
    const entity = ctx.knownEntities.find((e) => e.id === id);
    if (!entity) {
      return {
        ok: false,
        action: req.action,
        reason: "entity-missing",
        message: `entity not found: ${id}`,
        partiallyAffected: affected,
      };
    }
    const group = groupByIdentity(entity, ctx.knownEntities);
    if (group.length < 2) continue; // not contested → no-op
    const winner = pickWinner(group);
    for (const copy of group) {
      if (copy.id === winner.id) continue;
      const res = await deleteFileEntity(copy, ctx);
      if (!res.ok) {
        return {
          ok: false,
          action: req.action,
          reason: res.reason,
          message: res.message,
          partiallyAffected: affected,
        };
      }
      affected.push(res.affected);
    }
  }
  return { ok: true, action: req.action, affected };
}

function groupByIdentity(entity: Entity, all: Entity[]): Entity[] {
  if (!entity.identity) return [entity];
  return all.filter((e) => e.identity === entity.identity);
}

function pickWinner(group: Entity[]): Entity {
  return [...group].sort(
    (a, b) => SCOPE_PRECEDENCE[b.scope] - SCOPE_PRECEDENCE[a.scope],
  )[0]!;
}

// ── promote / demote scope ─────────────────────────────────────────────────

async function runScopeMove(
  req: BulkRequest,
  ctx: BulkContext,
  direction: "up" | "down",
): Promise<BulkResponse> {
  const affected: BulkAffected[] = [];
  for (const id of req.entityIds) {
    const entity = ctx.knownEntities.find((e) => e.id === id);
    if (!entity) {
      return {
        ok: false,
        action: req.action,
        reason: "entity-missing",
        message: `entity not found: ${id}`,
        partiallyAffected: affected,
      };
    }
    const target =
      direction === "up" ? scopeAboveFrom(entity) : scopeBelowFrom(entity);
    if (!target) {
      return {
        ok: false,
        action: req.action,
        reason: "action-not-applicable",
        message: `no ${direction === "up" ? "higher" : "lower"} scope for ${entity.scope}`,
        partiallyAffected: affected,
      };
    }

    const canFileMove =
      entity.type === "skill" ||
      entity.type === "command" ||
      entity.type === "agent" ||
      entity.type === "memory";

    if (!canFileMove) {
      return {
        ok: false,
        action: req.action,
        reason: "action-not-applicable",
        message: `${entity.type} entities can't be scope-moved in v1.7`,
        partiallyAffected: affected,
      };
    }

    const destFile = resolveDestFile(entity, target, ctx);
    if (!destFile) {
      return {
        ok: false,
        action: req.action,
        reason: "action-not-applicable",
        message: `no destination path for ${entity.type} at scope ${target}`,
        partiallyAffected: affected,
      };
    }

    // Back up the source file before anything mutates.
    let backupPath: string;
    try {
      const bk = await createBackup({
        sourceFile: entity.sourceFile,
        scopeRoot: entity.scopeRoot,
        backupsDir: ctx.backupsDir,
      });
      backupPath = bk.backupPath;
    } catch (e) {
      return {
        ok: false,
        action: req.action,
        reason: "write-failed",
        message: `backup failed: ${(e as Error).message}`,
        partiallyAffected: affected,
      };
    }

    try {
      await fs.mkdir(path.dirname(destFile), { recursive: true });
      await fs.copyFile(entity.sourceFile, destFile);
      await fs.unlink(entity.sourceFile);
    } catch (e) {
      return {
        ok: false,
        action: req.action,
        reason: "write-failed",
        message: (e as Error).message,
        partiallyAffected: affected,
      };
    }

    affected.push({
      entityId: entity.id,
      sourceFile: entity.sourceFile,
      backupPath,
      newSourceFile: destFile,
    });
  }
  return { ok: true, action: req.action, affected };
}

function scopeAboveFrom(entity: Entity): Scope | null {
  // Wrapper preserves a hook for future entity-type-specific ladder tweaks.
  return scopeAbove(entity.scope);
}

function scopeBelowFrom(entity: Entity): Scope | null {
  return scopeBelow(entity.scope);
}

// Canonical destination path for file-backed entities at the given scope.
// We need the scope-root for the new scope as well — which we can't know from
// the entity alone for `slug` and `project` / `local`. For the common cases
// (global ↔ plugin, project ↔ local) we can derive it; for slug we require
// an existing slug-scope entity we can piggyback on.
function resolveDestFile(
  entity: Entity,
  target: Scope,
  ctx: BulkContext,
): string | null {
  const basename = path.basename(entity.sourceFile);
  const kindDir = entity.type === "memory" ? "memory" : `${entity.type}s`;

  switch (target) {
    case "global": {
      // ~/.claude/skills/<name>/SKILL.md — preserve parent dir for SKILL.md layout.
      return joinDestForKind(
        ctx.claudeHome,
        kindDir,
        entity.sourceFile,
        basename,
      );
    }
    case "plugin":
      // No canonical "plugin dir" — we'd need to know which plugin.
      // Treat as inapplicable; caller will surface the error.
      return null;
    case "project": {
      // We can only target `project` when we already have a concrete project
      // root in hand — which is the case for `local` → `project` moves.
      if (entity.scope === "local" || entity.scope === "project") {
        return joinDestForKind(
          path.join(entity.scopeRoot, ".claude"),
          kindDir,
          entity.sourceFile,
          basename,
        );
      }
      return null;
    }
    case "local": {
      if (entity.scope === "project") {
        return joinDestForKind(
          path.join(entity.scopeRoot, ".claude"),
          kindDir,
          entity.sourceFile,
          basename,
        );
      }
      return null;
    }
    case "slug": {
      if (entity.scope !== "slug") return null;
      return joinDestForKind(entity.scopeRoot, kindDir, entity.sourceFile, basename);
    }
  }
}

// Build `<root>/<kindDir>/<tail>` where tail is either `<name>/SKILL.md`
// (to preserve the dir-style layout) or just the basename for flat files.
function joinDestForKind(
  root: string,
  kindDir: string,
  oldSourceFile: string,
  basename: string,
): string {
  if (basename === "SKILL.md") {
    const parts = oldSourceFile.split(/[\\/]/);
    const parent = parts[parts.length - 2] ?? "";
    return path.join(root, kindDir, parent, "SKILL.md");
  }
  return path.join(root, kindDir, basename);
}

// ── delete-entity ──────────────────────────────────────────────────────────

async function runDeleteEntity(
  req: BulkRequest,
  ctx: BulkContext,
): Promise<BulkResponse> {
  const affected: BulkAffected[] = [];
  for (const id of req.entityIds) {
    const entity = ctx.knownEntities.find((e) => e.id === id);
    if (!entity) {
      return {
        ok: false,
        action: req.action,
        reason: "entity-missing",
        message: `entity not found: ${id}`,
        partiallyAffected: affected,
      };
    }
    const group = groupByIdentity(entity, ctx.knownEntities);
    for (const copy of group) {
      const res = await deleteFileEntity(copy, ctx);
      if (!res.ok) {
        return {
          ok: false,
          action: req.action,
          reason: res.reason,
          message: res.message,
          partiallyAffected: affected,
        };
      }
      affected.push(res.affected);
    }
  }
  return { ok: true, action: req.action, affected };
}

// ── dismiss-stale / flag-for-review ────────────────────────────────────────
// Persist marker entries to ~/.claude/memmgmt-state.json. The stale-detection
// layer consults this file at read-time.

async function runMarker(
  req: BulkRequest,
  ctx: BulkContext,
  bucket: "dismissedStale" | "flaggedForReview",
): Promise<BulkResponse> {
  const markerFile = path.join(ctx.claudeHome, "memmgmt-state.json");
  const state = await readState(markerFile);
  const now = Date.now();
  const list = (state[bucket] ??= []) as Array<{
    entityId: string;
    atMs: number;
  }>;
  const affected: BulkAffected[] = [];
  for (const id of req.entityIds) {
    const entity = ctx.knownEntities.find((e) => e.id === id);
    if (!entity) {
      return {
        ok: false,
        action: req.action,
        reason: "entity-missing",
        message: `entity not found: ${id}`,
        partiallyAffected: affected,
      };
    }
    const idx = list.findIndex((m) => m.entityId === id);
    if (idx >= 0) list[idx] = { entityId: id, atMs: now };
    else list.push({ entityId: id, atMs: now });
    affected.push({
      entityId: entity.id,
      sourceFile: entity.sourceFile,
      markerFile,
    });
  }
  try {
    await fs.mkdir(path.dirname(markerFile), { recursive: true });
    await fs.writeFile(markerFile, JSON.stringify(state, null, 2) + "\n", "utf8");
  } catch (e) {
    return {
      ok: false,
      action: req.action,
      reason: "write-failed",
      message: (e as Error).message,
      partiallyAffected: affected,
    };
  }
  return { ok: true, action: req.action, affected };
}

interface MemmgmtState {
  dismissedStale?: Array<{ entityId: string; atMs: number }>;
  flaggedForReview?: Array<{ entityId: string; atMs: number }>;
}

async function readState(markerFile: string): Promise<MemmgmtState> {
  try {
    const raw = await fs.readFile(markerFile, "utf8");
    return JSON.parse(raw) as MemmgmtState;
  } catch {
    return {};
  }
}

// ── Low-level delete (file-layer for file-backed types; no-op for entries) ─

type DeleteResult =
  | { ok: true; affected: BulkAffected }
  | {
      ok: false;
      reason: "write-failed" | "action-not-applicable";
      message: string;
    };

async function deleteFileEntity(
  entity: Entity,
  ctx: BulkContext,
): Promise<DeleteResult> {
  // Settings-backed + CLAUDE.md-backed entries live inside a shared file;
  // deleting the underlying file would nuke unrelated entries. v1.7 scope
  // limit: only file-per-entity kinds are deletable via bulk ops.
  const fileBacked =
    entity.type === "skill" ||
    entity.type === "command" ||
    entity.type === "agent" ||
    entity.type === "memory" ||
    entity.type === "keybinding" ||
    entity.type === "plugin";
  if (!fileBacked) {
    return {
      ok: false,
      reason: "action-not-applicable",
      message: `${entity.type} entries can't be bulk-deleted at the file layer`,
    };
  }
  let backupPath: string;
  try {
    const bk = await createBackup({
      sourceFile: entity.sourceFile,
      scopeRoot: entity.scopeRoot,
      backupsDir: ctx.backupsDir,
    });
    backupPath = bk.backupPath;
  } catch (e) {
    return {
      ok: false,
      reason: "write-failed",
      message: `backup failed: ${(e as Error).message}`,
    };
  }
  try {
    await fs.unlink(entity.sourceFile);
  } catch (e) {
    return {
      ok: false,
      reason: "write-failed",
      message: (e as Error).message,
    };
  }
  return {
    ok: true,
    affected: {
      entityId: entity.id,
      sourceFile: entity.sourceFile,
      backupPath,
    },
  };
}

