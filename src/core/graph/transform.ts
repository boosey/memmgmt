import type {
  ArtifactNode,
  GhostSlug,
  ParseError,
  RawArtifact,
  SlugMetadata,
} from "../types";
import type {
  Entity,
  EntityParseError,
  EntityType,
  GraphPayload,
  Relation,
} from "../entities";
import { authorBucket } from "./authorResolver";
import { buildGraph } from "./builder";
import { DetectionEmitter } from "./detections";
import { identityKey } from "./overrideDetector";
import { parsePluginManifest } from "../parsers/pluginManifest";
import { parseSettings } from "../parsers/settings";
import { PseudoNodeRegistry } from "./pseudoNodes";
import {
  deriveAccretesFrom,
  deriveFiresOn,
  deriveGates,
  deriveImports,
  deriveInvokes,
  deriveProvides,
} from "./relations";
import { isMemoryStale } from "../health/stale";
import { shouldWarn } from "../health/warn";
import { DETECTION_CONVENTIONS } from "../entities";

// ── Kind mapping ────────────────────────────────────────────────────────────

function settingsEntryType(sd: unknown): EntityType {
  const e = sd as { kind?: string } | null;
  switch (e?.kind) {
    case "permission":
      return "permission";
    case "hook":
      return "hook";
    case "env":
      return "env";
    case "mcp-server":
      return "mcp-server";
    default:
      // 'other' keys fall back to env-less standing-instruction? Keep as
      // permission-shaped? The UI won't render these in v1.6 — they still
      // need a type. Route them to env as the closest "loose config" bucket.
      return "env";
  }
}

function artifactKindToEntityType(node: ArtifactNode): EntityType | null {
  switch (node.kind) {
    case "claude-md-section":
      return "standing-instruction";
    case "settings-entry":
      return settingsEntryType(node.structuredData);
    case "skill":
      return "skill";
    case "command":
      return "command";
    case "typed-memory":
      return "memory";
    case "memory-index-entry":
      return "memory";
    case "keybindings":
      return "keybinding";
    case "plugin-manifest":
      return "plugin";
    case "agent":
      return "agent";
  }
}

// ── Imports extraction ──────────────────────────────────────────────────────
// Surface @path imports for standing-instructions only. Other entity types
// don't embed imports in v1.6.

function importsFor(node: ArtifactNode): string[] | undefined {
  if (node.kind !== "claude-md-section") return undefined;
  const sd = node.structuredData as { imports?: string[] } | null;
  if (!sd?.imports?.length) return undefined;
  return sd.imports.map((ref) => (ref.startsWith("@") ? ref : `@${ref}`));
}

// ── ArtifactNode → Entity ────────────────────────────────────────────────────

export interface TransformInput {
  node: ArtifactNode;
  type: EntityType;
  identity: string | null;
  author: "anthropic" | "community" | "you" | "unknown";
  stale?: boolean;
  warn?: boolean;
  plugin?: string;
}

export function transformNodeToEntity(input: TransformInput): Entity {
  const { node, type, identity, author } = input;
  const ent: Entity = {
    id: node.id,
    type,
    scope: node.scope,
    author,
    title: node.title,
    intent: node.intentSummary,
    sourceFile: node.sourceFile,
    scopeRoot: node.scopeRoot,
    mtimeMs: node.mtimeMs,
    rawContent: node.rawContent,
    structured: node.structuredData,
  };
  if (identity) ent.identity = identity;
  const imps = importsFor(node);
  if (imps) ent.imports = imps;
  if (node.parseError) ent.parseError = node.parseError;
  if (node.hasDeadImports) ent.hasDeadImports = node.hasDeadImports;
  if (node.slug) ent.slugRef = node.slug;
  if (input.plugin) ent.plugin = input.plugin;
  if (input.stale) ent.stale = true;
  if (input.warn) ent.warn = true;
  return ent;
}

// ── Top-level orchestration ──────────────────────────────────────────────────

export interface BuildPayloadInput {
  raws: RawArtifact[];
  slugMetadata: SlugMetadata[];
  ghostSlugs: GhostSlug[];
  crawledAtMs: number;
  homeDir?: string;
  /** Overridable for tests. Defaults to fs.existsSync. */
  exists?: (absPath: string) => boolean;
}

export interface BuildPayloadResult {
  payload: GraphPayload;
  /** Internal ArtifactNode[] — preserved for /api/artifact/[id]. */
  nodes: ArtifactNode[];
  /** Propagated from builder. */
  parseErrors: ParseError[];
}

export function buildPayload(input: BuildPayloadInput): BuildPayloadResult {
  const opts: { homeDir?: string } = {};
  if (input.homeDir !== undefined) opts.homeDir = input.homeDir;
  const graph = buildGraph(input.raws, opts);

  // Plugin name-by-scopeRoot for `entity.plugin`.
  const pluginNameByRoot = new Map<string, string>();
  for (const n of graph.nodes) {
    if (n.kind === "plugin-manifest") {
      const parsed = n.structuredData as { name?: string } | null;
      if (parsed?.name) pluginNameByRoot.set(n.scopeRoot, parsed.name);
    }
  }

  // Transform ArtifactNode → Entity.
  const entities: Entity[] = [];
  for (const n of graph.nodes) {
    const type = artifactKindToEntityType(n);
    if (!type) continue;

    // Memory-index entries are deliberately dropped — the relevant memory
    // is already represented by the typed-memory artifact at the same file.
    if (n.kind === "memory-index-entry") continue;

    const resolved = resolveNodeAuthor(n);
    const bucket = authorBucket(resolved, n.scope);
    const id = identityKey(n);
    const plug = pluginNameByRoot.get(n.scopeRoot);
    const ent = transformNodeToEntity({
      node: n,
      type,
      identity: id,
      author: bucket,
      ...(plug && n.scope === "plugin" ? { plugin: plug } : {}),
    });
    if (shouldWarn(ent)) ent.warn = true;
    entities.push(ent);
  }

  // Health flags that need cross-entity context.
  for (const e of entities) {
    if (isMemoryStale(e, input.slugMetadata)) e.stale = true;
  }

  // Relation derivation.
  const registry = new PseudoNodeRegistry();
  const relations: Relation[] = [];
  relations.push(...deriveProvides(entities));
  relations.push(...deriveInvokes(entities));
  const importsOpts: { homeDir?: string; exists?: (p: string) => boolean } = {};
  if (input.homeDir !== undefined) importsOpts.homeDir = input.homeDir;
  if (input.exists !== undefined) importsOpts.exists = input.exists;
  relations.push(...deriveImports(entities, registry, importsOpts));
  relations.push(
    ...deriveAccretesFrom(entities, input.slugMetadata, registry),
  );
  relations.push(...deriveFiresOn(entities, registry));
  relations.push(...deriveGates(entities, registry));

  // Register all slug pseudo-nodes — including those never referenced by
  // accretes-from (live slugs with no memories) and ghost slugs — so the
  // UI can surface every slug as a pin target.
  for (const m of input.slugMetadata) {
    registry.registerSlug({
      name: m.slug,
      projectPath: m.projectPath,
      sessionCount: m.sessionCount,
      lastActiveMs: m.lastActiveMs,
      isGhost: false,
    });
  }
  for (const g of input.ghostSlugs) {
    registry.registerSlug({
      name: g.slug,
      projectPath: g.expectedPath,
      sessionCount: 0,
      lastActiveMs: 0,
      isGhost: true,
    });
  }

  // Detection emission.
  const emitter = new DetectionEmitter();
  emitDetectionsFromRaws(input.raws, emitter);
  emitDetectionsFromEntities(entities, emitter);

  // Surface any dead-imports that weren't already captured as broken
  // imports-edges (defensive — deriveImports already covers this).

  const parseErrors: EntityParseError[] = graph.parseErrors.map((e) => ({
    entityId: e.artifactId,
    message: e.message,
  }));

  const payload: GraphPayload = {
    entities,
    relations,
    pseudoNodes: registry.flush(),
    detections: emitter.flush(),
    parseErrors,
    crawledAtMs: input.crawledAtMs,
  };
  return { payload, nodes: graph.nodes, parseErrors: graph.parseErrors };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveNodeAuthor(
  n: ArtifactNode,
): { author: string | null; publisher: string | null; isOfficial: boolean } {
  // Re-run resolveAuthor for each node. The builder attached `author`
  // (string | null) + `isOfficial` directly, so we can lift that back out.
  return {
    author: n.author,
    publisher: n.publisher ?? null,
    isOfficial: n.isOfficial,
  };
}

function emitDetectionsFromRaws(
  raws: RawArtifact[],
  emitter: DetectionEmitter,
) {
  for (const r of raws) {
    if (r.kind === "plugin-manifest") {
      try {
        const parsed = parsePluginManifest(r.rawContent, r.sourceFile);
        emitPluginManifestDetections(parsed, r, emitter);
      } catch {
        /* parse errors are captured by buildGraph; don't double-report */
      }
    }
    if (r.kind === "settings-entry") {
      try {
        const parsed = parseSettings(r.rawContent);
        for (const k of parsed.unknownTopLevelKeys) {
          emitter.emit(
            DETECTION_CONVENTIONS.SETTINGS_UNKNOWN_TOP_LEVEL.key,
            r.sourceFile,
            k,
          );
        }
      } catch {
        /* parse errors captured upstream */
      }
    }
  }
}

function emitPluginManifestDetections(
  parsed: { raw: Record<string, unknown> },
  r: RawArtifact,
  emitter: DetectionEmitter,
) {
  const raw = parsed.raw;
  if ("subAgents" in raw || "subagents" in raw) {
    emitter.emit(
      DETECTION_CONVENTIONS.PLUGIN_SUB_AGENTS.key,
      r.sourceFile,
      "subAgents",
    );
  }
  // Plugin-declared hooks aren't yet lifted to per-item hook entities
  // (v1.6 scope limit) — surface them in the accordion so the user can see
  // the count. Plugin-declared mcpServers ARE lifted (see builder.ts
  // emitPluginManifest), so no detection for those in the normal case.
  if ("hooks" in raw && raw.hooks && typeof raw.hooks === "object") {
    emitter.emit(
      DETECTION_CONVENTIONS.PLUGIN_MCP_SERVERS_UNPARSED.key,
      r.sourceFile,
      "hooks",
    );
  }
  // Only flag mcpServers as unparsed if the shape isn't an object map we
  // can handle (e.g. an array form or a string).
  const mcp = raw.mcpServers;
  if (mcp !== undefined && (typeof mcp !== "object" || Array.isArray(mcp))) {
    emitter.emit(
      DETECTION_CONVENTIONS.PLUGIN_MCP_SERVERS_UNPARSED.key,
      r.sourceFile,
      "mcpServers",
    );
  }
}

// Simple body-scan heuristics for the "references another entity" detections.
const ENTITY_REF_RE = /@references\//;
const BODY_INVOKE_RE = /\/(\w[\w-]*)\b/g;

function emitDetectionsFromEntities(
  entities: Entity[],
  emitter: DetectionEmitter,
) {
  const commandNames = new Set<string>();
  const skillNames = new Set<string>();
  for (const e of entities) {
    if (e.type === "command" && e.title) commandNames.add(e.title);
    if (e.type === "skill" && e.title) skillNames.add(e.title);
  }
  for (const e of entities) {
    if (e.type === "skill") {
      const body = (e.structured as { body?: string } | null)?.body ?? "";
      if (ENTITY_REF_RE.test(body)) {
        emitter.emit(
          DETECTION_CONVENTIONS.SKILL_REFERENCES_IMPORT.key,
          e.sourceFile,
        );
      }
      for (const m of body.matchAll(BODY_INVOKE_RE)) {
        const token = m[1]!;
        if (skillNames.has(token) && token !== e.title) {
          emitter.emit(
            DETECTION_CONVENTIONS.SKILL_BODY_REFERENCES_ENTITY.key,
            e.sourceFile,
            token,
          );
          break;
        }
      }
    }
    if (e.type === "command") {
      const body = (e.structured as { body?: string } | null)?.body ?? "";
      for (const m of body.matchAll(BODY_INVOKE_RE)) {
        const token = m[1]!;
        if (commandNames.has(token) && token !== e.title) {
          emitter.emit(
            DETECTION_CONVENTIONS.CMD_BODY_REFERENCES_ENTITY.key,
            e.sourceFile,
            token,
          );
          break;
        }
      }
    }
  }
}

