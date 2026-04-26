export type Scope = "global" | "slug" | "project" | "local";

export type ArtifactKind =
  | "claude-md-section"
  | "settings-entry"
  | "memory-index-entry"
  | "skill"
  | "command"
  | "typed-memory"
  | "keybindings"
  | "plugin-manifest"
  | "agent";

export type ArtifactGranularity = "entry" | "file";

export interface RawArtifact {
  id: string;
  kind: ArtifactKind;
  granularity: ArtifactGranularity;
  scope: Scope;
  sourceFile: string;
  scopeRoot: string;
  slug?: string;
  rawContent: string;
  mtimeMs: number;
  entryKey?: string;
}

export interface ParseError {
  artifactId: string;
  message: string;
}

export interface ArtifactNode {
  id: string;
  kind: ArtifactKind;
  granularity: ArtifactGranularity;
  scope: Scope;
  sourceFile: string;
  scopeRoot: string;
  slug?: string;
  title: string;
  intentSummary: string;
  author: string | null;
  publisher?: string;
  isOfficial: boolean;
  rawContent: string;
  structuredData: unknown;
  mtimeMs: number;
  entryKey?: string;
  parseError?: string;
  hasDeadImports?: boolean;
  isInformational?: boolean;
  enabled?: boolean;
  disabledReason?: "plugin" | "config";
}

export type EdgeKind =
  | "imports"
  | "overrides"
  | "plugin-provides"
  | "contains"
  | "dead-import";

export interface GraphEdge {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  annotation?: string;
}

export interface SlugMetadata {
  slug: string;
  projectPath: string;
  sessionCount: number;
  lastActiveMs: number;
}

export interface GhostSlug {
  slug: string;
  expectedPath: string;
}

export interface Graph {
  nodes: ArtifactNode[];
  edges: GraphEdge[];
  ghostSlugs: GhostSlug[];
  slugMetadata: SlugMetadata[];
  parseErrors: ParseError[];
  crawledAtMs: number;
}

export type AbsolutePath = string & { readonly __brand: "AbsolutePath" };
