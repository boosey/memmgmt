import { describe, it, expect } from "vitest";
import { buildPayload } from "@/core/graph/transform";
import type { RawArtifact, SlugMetadata, GhostSlug } from "@/core/types";

function raw(partial: Partial<RawArtifact>): RawArtifact {
  return {
    id: "r",
    kind: "claude-md-section",
    granularity: "entry",
    scope: "global",
    sourceFile: "/abs/CLAUDE.md",
    scopeRoot: "/abs",
    rawContent: "",
    mtimeMs: 0,
    ...partial,
  };
}

function build(
  raws: RawArtifact[],
  opts: {
    slugMetadata?: SlugMetadata[];
    ghostSlugs?: GhostSlug[];
    exists?: (p: string) => boolean;
  } = {},
) {
  return buildPayload({
    raws,
    slugMetadata: opts.slugMetadata ?? [],
    ghostSlugs: opts.ghostSlugs ?? [],
    crawledAtMs: 1,
    homeDir: "/home/u",
    exists: opts.exists ?? (() => true),
  });
}

describe("buildPayload kind mapping", () => {
  it("maps claude-md-section → standing-instruction", () => {
    const { payload } = build([
      raw({ rawContent: "# Top\nbody\n" }),
    ]);
    expect(payload.entities[0]!.type).toBe("standing-instruction");
  });

  it("maps settings permission/hook/env/mcp-server subtypes", () => {
    const src = JSON.stringify({
      permissions: { allow: ["Bash(git *)"] },
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command" }] }],
      },
      env: { DEBUG: "1" },
      mcpServers: { foo: { command: "node" } },
    });
    const { payload } = build([
      raw({ kind: "settings-entry", sourceFile: "/abs/s.json", rawContent: src }),
    ]);
    const types = payload.entities.map((e) => e.type).sort();
    expect(types).toContain("permission");
    expect(types).toContain("hook");
    expect(types).toContain("env");
    expect(types).toContain("mcp-server");
  });

  it("maps skill/command/agent/plugin/keybinding/memory", () => {
    const raws: RawArtifact[] = [
      raw({
        id: "s",
        kind: "skill",
        sourceFile: "/abs/skills/foo/SKILL.md",
        rawContent: `---\nname: foo\ndescription: d\n---\nbody`,
      }),
      raw({
        id: "c",
        kind: "command",
        sourceFile: "/abs/commands/x.md",
        rawContent: `---\ndescription: d\n---\nbody`,
      }),
      raw({
        id: "a",
        kind: "agent",
        sourceFile: "/abs/agents/y.md",
        rawContent: `---\nname: y\ndescription: d\n---\nbody`,
      }),
      raw({
        id: "p",
        kind: "plugin-manifest",
        sourceFile: "/abs/p/.claude-plugin/plugin.json",
        scopeRoot: "/abs/p",
        scope: "plugin",
        rawContent: JSON.stringify({ name: "dbtools", author: "Bob" }),
      }),
      raw({
        id: "k",
        kind: "keybindings",
        sourceFile: "/abs/keybindings.json",
        rawContent: JSON.stringify({ "cmd-k": "palette" }),
      }),
      raw({
        id: "m",
        kind: "typed-memory",
        sourceFile: "/abs/projects/myproj/memory/user.md",
        scope: "slug",
        rawContent: `---\nname: user\ndescription: d\ntype: user\n---\nbody`,
      }),
    ];
    const { payload } = build(raws);
    const types = new Set(payload.entities.map((e) => e.type));
    expect(types.has("skill")).toBe(true);
    expect(types.has("command")).toBe(true);
    expect(types.has("agent")).toBe(true);
    expect(types.has("plugin")).toBe(true);
    expect(types.has("keybinding")).toBe(true);
    expect(types.has("memory")).toBe(true);
  });
});

describe("buildPayload author buckets", () => {
  it("classifies Anthropic plugin contributions as anthropic", () => {
    const plugManifest = raw({
      id: "p",
      kind: "plugin-manifest",
      sourceFile: "/abs/plug/.claude-plugin/plugin.json",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: JSON.stringify({ name: "p", author: "Anthropic" }),
    });
    const skill = raw({
      id: "s",
      kind: "skill",
      sourceFile: "/abs/plug/skills/foo/SKILL.md",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: `---\nname: foo\ndescription: d\n---\nbody`,
    });
    const { payload } = build([plugManifest, skill]);
    const s = payload.entities.find((e) => e.type === "skill")!;
    expect(s.author).toBe("anthropic");
  });

  it("classifies plugin with no manifest author as unknown and flags warn", () => {
    const plug = raw({
      id: "p",
      kind: "plugin-manifest",
      sourceFile: "/abs/plug/.claude-plugin/plugin.json",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: JSON.stringify({ name: "p" }),
    });
    const skill = raw({
      id: "s",
      kind: "skill",
      sourceFile: "/abs/plug/skills/foo/SKILL.md",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: `---\nname: foo\ndescription: d\n---\nbody`,
    });
    const { payload } = build([plug, skill]);
    const s = payload.entities.find((e) => e.type === "skill")!;
    expect(s.author).toBe("unknown");
    expect(s.warn).toBe(true);
  });

  it("classifies plugin with non-Anthropic manifest author as community", () => {
    const plug = raw({
      id: "p",
      kind: "plugin-manifest",
      sourceFile: "/abs/plug/.claude-plugin/plugin.json",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: JSON.stringify({ name: "p", author: "Jane" }),
    });
    const skill = raw({
      id: "s",
      kind: "skill",
      sourceFile: "/abs/plug/skills/foo/SKILL.md",
      scopeRoot: "/abs/plug",
      scope: "plugin",
      rawContent: `---\nname: foo\ndescription: d\n---\nbody`,
    });
    const { payload } = build([plug, skill]);
    const s = payload.entities.find((e) => e.type === "skill")!;
    expect(s.author).toBe("community");
  });

  it("classifies user-scope items as you", () => {
    const { payload } = build([
      raw({ rawContent: "# Top\nbody\n" }),
    ]);
    expect(payload.entities[0]!.author).toBe("you");
  });
});

describe("buildPayload identity + imports", () => {
  it("attaches identity for overridable kinds", () => {
    const { payload } = build([
      raw({
        id: "g",
        rawContent: "# Coding\nx\n",
        scope: "global",
      }),
      raw({
        id: "p",
        sourceFile: "/abs/proj/CLAUDE.md",
        scopeRoot: "/abs/proj",
        rawContent: "# Coding\ny\n",
        scope: "project",
      }),
    ]);
    const instructions = payload.entities.filter(
      (e) => e.type === "standing-instruction",
    );
    const identities = instructions.map((e) => e.identity);
    expect(identities.every((i) => i === "cms::1::Coding")).toBe(true);
  });

  it("populates imports[] on standing-instructions", () => {
    const { payload } = build([
      raw({
        rawContent: "# Top\n@./foo.md\n@./bar.md\n",
      }),
    ]);
    const si = payload.entities.find(
      (e) => e.type === "standing-instruction",
    )!;
    expect(si.imports).toEqual(["@./foo.md", "@./bar.md"]);
  });
});

describe("buildPayload health flags", () => {
  it("flags stale memory when slug.lastActiveMs is newer by > 14 days", () => {
    const now = Date.now();
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
    const { payload } = build(
      [
        raw({
          id: "m",
          kind: "typed-memory",
          sourceFile: "/abs/projects/s/memory/foo.md",
          scopeRoot: "/abs/projects/s",
          scope: "slug",
          slug: "s",
          mtimeMs: now - FIFTEEN_DAYS,
          rawContent: `---\nname: foo\ndescription: d\ntype: user\n---\nbody`,
        }),
      ],
      {
        slugMetadata: [
          {
            slug: "s",
            projectPath: "/abs/s",
            sessionCount: 3,
            lastActiveMs: now,
          },
        ],
      },
    );
    const m = payload.entities.find((e) => e.type === "memory")!;
    expect(m.stale).toBe(true);
  });

  it("does not flag fresh memory as stale", () => {
    const now = Date.now();
    const { payload } = build(
      [
        raw({
          id: "m",
          kind: "typed-memory",
          sourceFile: "/abs/projects/s/memory/foo.md",
          scope: "slug",
          slug: "s",
          mtimeMs: now,
          rawContent: `---\nname: foo\ndescription: d\ntype: user\n---\nbody`,
        }),
      ],
      {
        slugMetadata: [
          {
            slug: "s",
            projectPath: "/abs/s",
            sessionCount: 3,
            lastActiveMs: now,
          },
        ],
      },
    );
    const m = payload.entities.find((e) => e.type === "memory")!;
    expect(m.stale).toBeUndefined();
  });
});

describe("buildPayload pseudo-nodes + ghost slugs", () => {
  it("registers every slug as a pseudo-node, including ghosts", () => {
    const { payload } = build([], {
      slugMetadata: [
        { slug: "live", projectPath: "/a", sessionCount: 1, lastActiveMs: 1 },
      ],
      ghostSlugs: [{ slug: "dead", expectedPath: "/b" }],
    });
    const slugs = payload.pseudoNodes.filter((p) => p.kind === "slug");
    const byName = Object.fromEntries(slugs.map((s) => [s.id, s]));
    expect(byName["slug:live"]).toBeDefined();
    expect(byName["slug:dead"]).toBeDefined();
    expect((byName["slug:dead"] as { isGhost: boolean }).isGhost).toBe(true);
  });
});

describe("buildPayload payload shape", () => {
  it("returns all top-level keys in the contract", () => {
    const { payload } = build([]);
    expect(payload).toHaveProperty("entities");
    expect(payload).toHaveProperty("relations");
    expect(payload).toHaveProperty("pseudoNodes");
    expect(payload).toHaveProperty("detections");
    expect(payload).toHaveProperty("parseErrors");
    expect(payload).toHaveProperty("crawledAtMs");
  });
});

describe("buildPayload plugin-manifest mcpServers extraction", () => {
  it("lifts plugin-declared mcpServers into per-server mcp-server entities", () => {
    const { payload } = build([
      raw({
        id: "p",
        kind: "plugin-manifest",
        sourceFile: "/abs/plug/.claude-plugin/plugin.json",
        scopeRoot: "/abs/plug",
        scope: "plugin",
        rawContent: JSON.stringify({
          name: "multi-tool",
          author: "Jane",
          mcpServers: {
            foo: { command: "node", args: ["foo.js"] },
            bar: { url: "https://bar.example/mcp" },
          },
        }),
      }),
    ]);
    const mcp = payload.entities.filter((e) => e.type === "mcp-server");
    expect(mcp.map((e) => e.title).sort()).toEqual(["bar", "foo"]);
    expect(mcp.every((e) => e.scope === "plugin")).toBe(true);
    const det = payload.detections.find(
      (d) => d.convention === "plugin-manifest-mcp-servers-unparsed",
    );
    const mcpOccurrences =
      det?.occurrences.filter((o) => o.excerpt === "mcpServers") ?? [];
    expect(mcpOccurrences).toHaveLength(0);
  });

  it("still emits unparsed detection when mcpServers shape is invalid", () => {
    const { payload } = build([
      raw({
        id: "p",
        kind: "plugin-manifest",
        sourceFile: "/abs/plug/.claude-plugin/plugin.json",
        scopeRoot: "/abs/plug",
        scope: "plugin",
        rawContent: JSON.stringify({
          name: "weird",
          mcpServers: ["not-an-object-map"],
        }),
      }),
    ]);
    const det = payload.detections.find(
      (d) => d.convention === "plugin-manifest-mcp-servers-unparsed",
    );
    expect(det).toBeDefined();
    expect(det!.occurrences.some((o) => o.excerpt === "mcpServers")).toBe(true);
  });

  it("emits provides relation from plugin entity to mcp-server entities", () => {
    const { payload } = build([
      raw({
        id: "p",
        kind: "plugin-manifest",
        sourceFile: "/abs/plug/.claude-plugin/plugin.json",
        scopeRoot: "/abs/plug",
        scope: "plugin",
        rawContent: JSON.stringify({
          name: "dbtools",
          mcpServers: { postgres: { command: "pg-mcp" } },
        }),
      }),
    ]);
    const plug = payload.entities.find((e) => e.type === "plugin")!;
    const mcp = payload.entities.find((e) => e.type === "mcp-server")!;
    const rel = payload.relations.find(
      (r) => r.kind === "provides" && r.from === plug.id && r.to === mcp.id,
    );
    expect(rel).toBeDefined();
  });
});

describe("buildPayload agent title fallback", () => {
  it("uses the parent directory name for <name>/AGENT.md files", () => {
    const { payload } = build([
      raw({
        id: "a",
        kind: "agent",
        sourceFile: "/abs/plug/agents/seo-auditor/AGENT.md",
        scopeRoot: "/abs/plug",
        scope: "plugin",
        rawContent: `---\ndescription: Runs an SEO audit.\n---\nbody\n`,
      }),
    ]);
    const agent = payload.entities.find((e) => e.type === "agent")!;
    expect(agent.title).toBe("seo-auditor");
  });

  it("uses filename-without-extension for <name>.md files", () => {
    const { payload } = build([
      raw({
        id: "a",
        kind: "agent",
        sourceFile: "/abs/agents/reviewer.md",
        rawContent: `---\ndescription: Reviews code.\n---\nbody\n`,
      }),
    ]);
    const agent = payload.entities.find((e) => e.type === "agent")!;
    expect(agent.title).toBe("reviewer");
  });

  it("prefers frontmatter name: when present", () => {
    const { payload } = build([
      raw({
        id: "a",
        kind: "agent",
        sourceFile: "/abs/plug/agents/seo-auditor/AGENT.md",
        rawContent: `---\nname: custom-name\ndescription: d\n---\nbody\n`,
      }),
    ]);
    const agent = payload.entities.find((e) => e.type === "agent")!;
    expect(agent.title).toBe("custom-name");
  });
});
