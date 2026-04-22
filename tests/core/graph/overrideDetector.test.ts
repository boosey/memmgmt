import { describe, it, expect } from "vitest";
import { detectOverrides } from "@/core/graph/overrideDetector";
import type { ArtifactNode } from "@/core/types";

function node(partial: Partial<ArtifactNode>): ArtifactNode {
  return {
    id: "x",
    kind: "claude-md-section",
    granularity: "entry",
    scope: "global",
    sourceFile: "/abs/CLAUDE.md",
    scopeRoot: "/abs",
    title: "",
    intentSummary: "",
    author: null,
    isOfficial: false,
    rawContent: "",
    structuredData: null,
    mtimeMs: 0,
    ...partial,
  };
}

describe("overrideDetector", () => {
  it("finds same CLAUDE.md heading across global and project scopes", () => {
    const nodes = [
      node({
        id: "g1",
        kind: "claude-md-section",
        scope: "global",
        structuredData: { heading: "Coding", level: 2 },
      }),
      node({
        id: "p1",
        kind: "claude-md-section",
        scope: "project",
        structuredData: { heading: "Coding", level: 2 },
      }),
    ];
    const edges = detectOverrides(nodes);
    expect(edges).toEqual([
      expect.objectContaining({
        kind: "overrides",
        from: "g1",
        to: "p1",
        annotation: "project overrides global",
      }),
    ]);
  });

  it("detects same permission rule across scopes", () => {
    const nodes = [
      node({
        id: "g1",
        kind: "settings-entry",
        scope: "global",
        structuredData: { kind: "permission", value: "Bash(git *)" },
      }),
      node({
        id: "l1",
        kind: "settings-entry",
        scope: "local",
        structuredData: { kind: "permission", value: "Bash(git *)" },
      }),
    ];
    const edges = detectOverrides(nodes);
    expect(edges[0]?.annotation).toBe("local overrides global");
  });

  it("emits no edge when identities differ", () => {
    const nodes = [
      node({
        id: "g1",
        kind: "skill",
        scope: "global",
        structuredData: { name: "a" },
      }),
      node({
        id: "p1",
        kind: "skill",
        scope: "project",
        structuredData: { name: "b" },
      }),
    ];
    expect(detectOverrides(nodes)).toEqual([]);
  });
});
