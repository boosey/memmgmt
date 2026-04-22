import { describe, it, expect } from "vitest";
import path from "node:path";
import { buildGraph } from "@/core/graph/builder";
import type { RawArtifact } from "@/core/types";

const ROOT = path.resolve("/abs/.claude");
const CLAUDE_MD = path.join(ROOT, "CLAUDE.md");
const IMP_MD = path.join(ROOT, "imp.md");
const SETTINGS = path.join(ROOT, "settings.json");

function raw(partial: Partial<RawArtifact>): RawArtifact {
  return {
    id: "r",
    kind: "claude-md-section",
    granularity: "entry",
    scope: "global",
    sourceFile: CLAUDE_MD,
    scopeRoot: ROOT,
    rawContent: "",
    mtimeMs: 0,
    ...partial,
  };
}

describe("buildGraph", () => {
  it("turns raws into nodes and emits imports edges", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "# Top\n@./imp.md\n",
      }),
      raw({
        id: "r2",
        sourceFile: IMP_MD,
        rawContent: "# Top\nimported\n",
      }),
    ];
    const g = buildGraph(raws);
    expect(g.nodes.length).toBeGreaterThan(0);
    expect(g.edges.some((e) => e.kind === "imports")).toBe(true);
  });

  it("emits contains edges from scope root to artifacts", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "# Top\nsome body\n",
      }),
    ];
    const g = buildGraph(raws);
    expect(g.edges.some((e) => e.kind === "contains")).toBe(true);
  });

  it("flags a dead import with a dead-import edge", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "# Top\n@./missing.md\n",
      }),
    ];
    const g = buildGraph(raws);
    expect(g.edges.some((e) => e.kind === "dead-import")).toBe(true);
  });

  it("preserves parse errors as nodes with parseError set", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        kind: "settings-entry",
        sourceFile: SETTINGS,
        rawContent: "this is not json",
      }),
    ];
    const g = buildGraph(raws);
    expect(g.parseErrors).toHaveLength(1);
    expect(g.nodes[0]?.parseError).toBeDefined();
  });
});
