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

  it("keeps empty headings (structural) and flags them as informational", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "# Level 1\n## Level 2\n### Level 3\nContent\n",
      }),
    ];
    const g = buildGraph(raws);
    const titles = g.nodes.map((n) => n.title);
    expect(titles).toContain("Level 1");
    expect(titles).toContain("Level 2");
    expect(titles).toContain("Level 3");

    const l1 = g.nodes.find((n) => n.title === "Level 1");
    const l2 = g.nodes.find((n) => n.title === "Level 2");
    const l3 = g.nodes.find((n) => n.title === "Level 3");

    expect(l1?.isInformational).toBe(true);
    expect(l2?.isInformational).toBe(true);
    expect(l3?.isInformational).toBeUndefined();
  });

  it("keeps empty headings if they are NOT followed by another heading", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "# Section 1\nContent\n# Empty Last Section\n",
      }),
    ];
    const g = buildGraph(raws);
    const titles = g.nodes.map((n) => n.title);
    expect(titles).toContain("Section 1");
    expect(titles).toContain("Empty Last Section");
  });

  it("flags sections containing only HTML comments as informational", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "r1",
        sourceFile: CLAUDE_MD,
        rawContent: "<!-- metadata -->\n# Actual Content\nBody\n",
      }),
    ];
    const g = buildGraph(raws);
    const preHeading = g.nodes.find((n) => n.title.includes("(pre-heading)"));
    const actualContent = g.nodes.find((n) => n.title === "Actual Content");

    expect(preHeading?.isInformational).toBe(true);
    expect(actualContent?.isInformational).toBeUndefined();
  });

  it("handles AGENTS.md with BEGIN/END comments correctly", () => {
    const content = `<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes.
<!-- END:nextjs-agent-rules -->
`;
    const raws: RawArtifact[] = [
      raw({
        id: "agents",
        sourceFile: "/abs/AGENTS.md",
        rawContent: content,
      }),
    ];
    const g = buildGraph(raws);
    const nodes = g.nodes;
    // Section 0: <!-- BEGIN... -->
    // Section 1: # This is NOT...
    expect(nodes).toHaveLength(2);
    const preHeading = nodes.find((n) => n.title.includes("(pre-heading)"));
    const heading = nodes.find((n) => n.title.includes("This is NOT"));

    expect(preHeading?.isInformational).toBe(true);
    expect(heading?.isInformational).toBeUndefined();
  });
});
