import type {
  ArtifactNode,
  GraphEdge,
  RawArtifact,
  Graph,
  ParseError,
} from "../types";
import { parseClaudeMd } from "../parsers/claudeMd";
import { parseSettings } from "../parsers/settings";
import { parseSkill } from "../parsers/skill";
import { parseCommand } from "../parsers/command";
import { parseTypedMemory, parseMemoryIndex } from "../parsers/memory";
import { parseKeybindings } from "../parsers/keybindings";
import { parsePluginManifest } from "../parsers/pluginManifest";
import { deriveIntentSummary } from "./intentSummary";
import { resolveAuthor, type ResolvedAuthor } from "./authorResolver";
import { resolveImport } from "./importResolver";
import { detectOverrides } from "./overrideDetector";

export interface BuildOptions {
  homeDir?: string;
}

type PluginManifestInfo = { author: string | null; publisher: string | null };

export function buildGraph(raws: RawArtifact[], opts: BuildOptions = {}): Graph {
  const nodes: ArtifactNode[] = [];
  const edges: GraphEdge[] = [];
  const parseErrors: ParseError[] = [];

  const pluginManifestByRoot = new Map<string, PluginManifestInfo>();
  for (const r of raws) {
    if (r.kind !== "plugin-manifest") continue;
    try {
      const m = parsePluginManifest(r.rawContent, r.sourceFile);
      pluginManifestByRoot.set(r.scopeRoot, {
        author: m.author,
        publisher: m.publisher,
      });
    } catch (e) {
      parseErrors.push({
        artifactId: r.id,
        message: `plugin manifest parse: ${(e as Error).message}`,
      });
    }
  }

  for (const r of raws) {
    try {
      switch (r.kind) {
        case "claude-md-section":
          nodes.push(...emitClaudeMdSections(r));
          break;
        case "settings-entry":
          nodes.push(...emitSettingsEntries(r));
          break;
        case "skill":
          nodes.push(
            emitSkill(r, pluginManifestByRoot.get(r.scopeRoot) ?? null),
          );
          break;
        case "slash-command":
          nodes.push(
            emitCommand(r, pluginManifestByRoot.get(r.scopeRoot) ?? null),
          );
          break;
        case "typed-memory":
          nodes.push(emitTypedMemory(r));
          break;
        case "memory-index-entry":
          nodes.push(...emitMemoryIndex(r));
          break;
        case "keybindings":
          nodes.push(emitKeybindings(r));
          break;
        case "plugin-manifest":
          nodes.push(emitPluginManifest(r));
          break;
      }
    } catch (e) {
      const msg = (e as Error).message;
      parseErrors.push({ artifactId: r.id, message: msg });
      nodes.push(fallbackNode(r, msg));
    }
  }

  const nodeByFile = new Map<string, ArtifactNode[]>();
  for (const n of nodes) {
    const arr = nodeByFile.get(n.sourceFile) ?? [];
    arr.push(n);
    nodeByFile.set(n.sourceFile, arr);
  }

  for (const n of nodes) {
    if (n.kind !== "claude-md-section") continue;
    const sd = n.structuredData as { imports?: string[] } | null;
    if (!sd?.imports?.length) continue;
    for (const ref of sd.imports) {
      const abs = resolveImport(ref, n.sourceFile, opts.homeDir);
      if (!abs) continue;
      const targets = nodeByFile.get(abs) ?? [];
      if (targets.length === 0) {
        edges.push({
          id: `dead-import::${n.id}::${ref}`,
          kind: "dead-import",
          from: n.id,
          to: `missing::${abs}`,
          annotation: ref,
        });
        n.hasDeadImports = true;
      } else {
        const target =
          targets.find(
            (t) => (t.structuredData as { level?: number } | null)?.level === 1,
          ) ?? targets[0]!;
        edges.push({
          id: `imports::${n.id}->${target.id}`,
          kind: "imports",
          from: n.id,
          to: target.id,
          annotation: ref,
        });
      }
    }
  }

  const pluginsByRoot = new Map<string, ArtifactNode>();
  for (const n of nodes)
    if (n.kind === "plugin-manifest") pluginsByRoot.set(n.scopeRoot, n);
  for (const n of nodes) {
    if (n.scope !== "plugin") continue;
    if (n.kind === "plugin-manifest") continue;
    const plug = pluginsByRoot.get(n.scopeRoot);
    if (plug) {
      edges.push({
        id: `provides::${plug.id}->${n.id}`,
        kind: "plugin-provides",
        from: plug.id,
        to: n.id,
      });
    }
  }

  edges.push(...detectOverrides(nodes));

  // contains edges from virtual scope-root pseudo nodes to artifacts
  for (const n of nodes) {
    const rootId = `scope-root::${n.scope}::${n.scopeRoot}`;
    edges.push({
      id: `contains::${rootId}->${n.id}`,
      kind: "contains",
      from: rootId,
      to: n.id,
    });
  }

  return {
    nodes,
    edges,
    ghostSlugs: [],
    slugMetadata: [],
    parseErrors,
    crawledAtMs: Date.now(),
  };
}

function baseNode(
  r: RawArtifact,
  title: string,
  structured: unknown,
  author: ResolvedAuthor,
  entryKey?: string,
  idSuffix = "",
): ArtifactNode {
  const id = idSuffix ? `${r.id}::${idSuffix}` : r.id;
  const intentSummary = deriveIntentSummary({
    kind: r.kind,
    structuredData: structured,
    rawContent: r.rawContent,
  });
  const node: ArtifactNode = {
    id,
    kind: r.kind,
    granularity: r.granularity,
    scope: r.scope,
    sourceFile: r.sourceFile,
    scopeRoot: r.scopeRoot,
    title,
    intentSummary,
    author: author.author,
    isOfficial: author.isOfficial,
    rawContent: r.rawContent,
    structuredData: structured,
    mtimeMs: r.mtimeMs,
  };
  if (r.slug !== undefined) node.slug = r.slug;
  if (author.publisher) node.publisher = author.publisher;
  if (entryKey !== undefined) node.entryKey = entryKey;
  return node;
}

function fallbackNode(r: RawArtifact, errMsg: string): ArtifactNode {
  const title = r.sourceFile.split(/[\\/]/).pop() ?? r.sourceFile;
  const node: ArtifactNode = {
    id: r.id,
    kind: r.kind,
    granularity: r.granularity,
    scope: r.scope,
    sourceFile: r.sourceFile,
    scopeRoot: r.scopeRoot,
    title,
    intentSummary: "(failed to parse)",
    author: null,
    isOfficial: false,
    rawContent: r.rawContent,
    structuredData: null,
    mtimeMs: r.mtimeMs,
    parseError: errMsg,
  };
  if (r.slug !== undefined) node.slug = r.slug;
  return node;
}

function emitClaudeMdSections(r: RawArtifact): ArtifactNode[] {
  const sections = parseClaudeMd(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: null,
    pluginManifest: null,
  });
  return sections.map((s, i) =>
    baseNode(
      r,
      s.heading || `(pre-heading) ${r.sourceFile.split(/[\\/]/).pop()}`,
      s,
      author,
      s.headingPath.join(" / ") || `section-${i}`,
      `s${i}`,
    ),
  );
}

function emitSettingsEntries(r: RawArtifact): ArtifactNode[] {
  const parsed = parseSettings(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: null,
    pluginManifest: null,
  });
  return parsed.entries.map((e) =>
    baseNode(
      r,
      titleForSettingsEntry(e),
      e,
      author,
      e.entryKey,
      e.entryKey.replace(/[^\w]/g, "_"),
    ),
  );
}

function titleForSettingsEntry(e: {
  kind: string;
  [k: string]: unknown;
}): string {
  if (e.kind === "permission") return String(e.value);
  if (e.kind === "hook") return `${e.event}/${e.matcher}`;
  if (e.kind === "env") return String(e.name);
  return String(e.key);
}

function emitSkill(
  r: RawArtifact,
  pm: PluginManifestInfo | null,
): ArtifactNode {
  const parsed = parseSkill(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: parsed.author,
    pluginManifest: pm,
  });
  return baseNode(
    r,
    parsed.name || (r.sourceFile.split(/[\\/]/).pop() ?? ""),
    parsed,
    author,
  );
}

function emitCommand(
  r: RawArtifact,
  pm: PluginManifestInfo | null,
): ArtifactNode {
  const parsed = parseCommand(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: parsed.author,
    pluginManifest: pm,
  });
  const filename = (r.sourceFile.split(/[\\/]/).pop() ?? "").replace(
    /\.md$/,
    "",
  );
  return baseNode(r, filename, { ...parsed, filename }, author);
}

function emitTypedMemory(r: RawArtifact): ArtifactNode {
  const parsed = parseTypedMemory(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: null,
    pluginManifest: null,
  });
  return baseNode(
    r,
    parsed.name || (r.sourceFile.split(/[\\/]/).pop() ?? ""),
    parsed,
    author,
  );
}

function emitMemoryIndex(r: RawArtifact): ArtifactNode[] {
  const entries = parseMemoryIndex(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: null,
    pluginManifest: null,
  });
  return entries.map((e, i) =>
    baseNode(r, e.title, e, author, e.file, `mi${i}`),
  );
}

function emitKeybindings(r: RawArtifact): ArtifactNode {
  const parsed = parseKeybindings(r.rawContent);
  const author = resolveAuthor({
    scope: r.scope,
    frontmatterAuthor: null,
    pluginManifest: null,
  });
  return baseNode(r, "Keybindings", parsed, author);
}

function emitPluginManifest(r: RawArtifact): ArtifactNode {
  const parsed = parsePluginManifest(r.rawContent, r.sourceFile);
  const author = resolveAuthor({
    scope: "plugin",
    frontmatterAuthor: null,
    pluginManifest: { author: parsed.author, publisher: parsed.publisher },
  });
  return baseNode(r, parsed.name, parsed, author);
}
