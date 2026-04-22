import type { ArtifactNode, GraphEdge, Scope } from "../types";

const PRECEDENCE: Record<Scope, number> = {
  local: 5,
  project: 4,
  slug: 3,
  plugin: 2,
  global: 1,
};

export function detectOverrides(nodes: ArtifactNode[]): GraphEdge[] {
  const groups = new Map<string, ArtifactNode[]>();
  for (const n of nodes) {
    const id = identityKey(n);
    if (!id) continue;
    const arr = groups.get(id) ?? [];
    arr.push(n);
    groups.set(id, arr);
  }

  const edges: GraphEdge[] = [];
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort(
      (a, b) => PRECEDENCE[b.scope] - PRECEDENCE[a.scope],
    );
    const winner = sorted[0]!;
    for (const loser of sorted.slice(1)) {
      edges.push({
        id: `overrides:${loser.id}->${winner.id}`,
        kind: "overrides",
        from: loser.id,
        to: winner.id,
        annotation: `${winner.scope} overrides ${loser.scope}`,
      });
    }
  }
  return edges;
}

function identityKey(n: ArtifactNode): string | null {
  const sd = n.structuredData as Record<string, unknown> | null | undefined;
  if (!sd) return null;
  switch (n.kind) {
    case "claude-md-section":
      return typeof sd.heading === "string" && sd.heading
        ? `cms::${sd.level}::${sd.heading}`
        : null;
    case "skill":
      return typeof sd.name === "string" && sd.name ? `skill::${sd.name}` : null;
    case "slash-command":
      return typeof sd.filename === "string" && sd.filename
        ? `cmd::${sd.filename}`
        : null;
    case "settings-entry": {
      if (sd.kind === "permission") return `perm::${sd.value}`;
      if (sd.kind === "hook") {
        const hookList = Array.isArray(sd.hooks) ? sd.hooks : [];
        return `hook::${sd.event}::${sd.matcher}::${JSON.stringify(hookList[0] ?? null)}`;
      }
      if (sd.kind === "env") return `env::${sd.name}`;
      if (sd.kind === "other") return `other::${sd.key}`;
      return null;
    }
    case "typed-memory":
      return typeof sd.name === "string" && sd.name ? `tmem::${sd.name}` : null;
    case "keybindings":
    case "memory-index-entry":
    case "plugin-manifest":
      return null;
  }
}
