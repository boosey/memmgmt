import type {
  PseudoNode,
  SlugPseudoNode,
  ToolPseudoNode,
  PathPseudoNode,
} from "../entities";
import { pseudoNodeId } from "../entities";

// Registry that tracks unique pseudo-nodes emitted by relation derivers.
// Each pseudo-node ID appears exactly once in the flushed list, even if
// multiple relations target it (e.g., several hooks + permissions all
// targeting `tool:Bash`).

export class PseudoNodeRegistry {
  private bySlug = new Map<string, SlugPseudoNode>();
  private byTool = new Map<string, ToolPseudoNode>();
  private byPath = new Map<string, PathPseudoNode>();

  /** Register or update a slug pseudo-node. Idempotent by slug name. */
  registerSlug(input: {
    name: string;
    projectPath: string;
    sessionCount: number;
    lastActiveMs: number;
    isGhost: boolean;
  }): string {
    const id = pseudoNodeId.slug(input.name);
    this.bySlug.set(input.name, {
      id,
      kind: "slug",
      name: input.name,
      projectPath: input.projectPath,
      sessionCount: input.sessionCount,
      lastActiveMs: input.lastActiveMs,
      isGhost: input.isGhost,
    });
    return id;
  }

  /** Register a tool pseudo-node. Matcher kept verbatim. */
  registerTool(matcher: string): string {
    const id = pseudoNodeId.tool(matcher);
    if (!this.byTool.has(matcher)) {
      this.byTool.set(matcher, { id, kind: "tool", matcher });
    }
    return id;
  }

  /** Register a path pseudo-node. Idempotent by @-prefixed path. */
  registerPath(atPath: string, broken: boolean): string {
    const id = pseudoNodeId.path(atPath);
    const existing = this.byPath.get(id);
    // If any registration marks this path as non-broken, preserve that.
    const nextBroken = existing ? existing.broken && broken : broken;
    this.byPath.set(id, {
      id,
      kind: "path",
      path: id,
      broken: nextBroken,
    });
    return id;
  }

  /** Flush to a stable, sorted PseudoNode[] for API output. */
  flush(): PseudoNode[] {
    const slugs = Array.from(this.bySlug.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const tools = Array.from(this.byTool.values()).sort((a, b) =>
      a.matcher.localeCompare(b.matcher),
    );
    const paths = Array.from(this.byPath.values()).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    return [...slugs, ...tools, ...paths];
  }

  has(id: string): boolean {
    return (
      id.startsWith("slug:") ? this.bySlug.has(id.slice("slug:".length))
      : id.startsWith("tool:") ? this.byTool.has(id.slice("tool:".length))
      : id.startsWith("@") ? this.byPath.has(id)
      : false
    );
  }
}
