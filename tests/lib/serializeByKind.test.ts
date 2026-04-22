import { describe, it, expect } from "vitest";
import { buildNextContent } from "@/lib/serializeByKind";
import { parseClaudeMd } from "@/core/parsers/claudeMd";
import { parseSettings } from "@/core/parsers/settings";
import type { ArtifactNode } from "@/core/types";

const CLAUDE_MD_SRC = `# A
intro

## B
old body

## C
stable
`;

function claudeMdNode(headingPath: string[]): ArtifactNode {
  const sections = parseClaudeMd(CLAUDE_MD_SRC);
  const sec = sections.find(
    (s) => s.headingPath.join("/") === headingPath.join("/"),
  )!;
  return {
    id: "n",
    kind: "claude-md-section",
    granularity: "entry",
    scope: "global",
    sourceFile: "/x/CLAUDE.md",
    scopeRoot: "/x",
    title: sec.heading,
    intentSummary: "",
    author: null,
    isOfficial: false,
    rawContent: CLAUDE_MD_SRC,
    structuredData: sec,
    mtimeMs: 0,
  };
}

describe("buildNextContent — claude-md-section body edit", () => {
  it("replaces only the target section body and leaves siblings intact", () => {
    const node = claudeMdNode(["A", "B"]);
    const draft = { ...(node.structuredData as object), body: "\nNEW\n\n" };
    const next = buildNextContent(node, draft);
    expect(next).toContain("NEW");
    expect(next).toContain("## C");
    expect(next).toContain("stable");
    expect(next).not.toContain("old body");
  });
});

const SETTINGS_SRC = `{
  "permissions": { "allow": ["Bash(git *)", "Read(~/*)"], "deny": [] },
  "env": { "DEBUG": "true" }
}
`;

function settingsEntryNode(entryKey: string) {
  const parsed = parseSettings(SETTINGS_SRC);
  const entry = parsed.entries.find((e) => e.entryKey === entryKey)!;
  return {
    id: "s",
    kind: "settings-entry",
    granularity: "entry",
    scope: "global",
    sourceFile: "/x/settings.json",
    scopeRoot: "/x",
    title: "",
    intentSummary: "",
    author: null,
    isOfficial: false,
    rawContent: SETTINGS_SRC,
    structuredData: entry,
    mtimeMs: 0,
  } satisfies ArtifactNode;
}

describe("buildNextContent — settings-entry edit", () => {
  it("updates a permission value and leaves other entries intact", () => {
    const node = settingsEntryNode("permissions.allow[0]");
    const next = buildNextContent(node, {
      kind: "permission" as const,
      entryKey: "permissions.allow[0]",
      group: "allow" as const,
      value: "Bash(git status)",
    });
    const parsed = JSON.parse(next);
    expect(parsed.permissions.allow[0]).toBe("Bash(git status)");
    expect(parsed.permissions.allow[1]).toBe("Read(~/*)");
    expect(parsed.env.DEBUG).toBe("true");
  });

  it("updates an env var", () => {
    const node = settingsEntryNode("env.DEBUG");
    const next = buildNextContent(node, {
      kind: "env" as const,
      entryKey: "env.DEBUG",
      name: "DEBUG",
      value: "false",
    });
    expect(JSON.parse(next).env.DEBUG).toBe("false");
  });
});
