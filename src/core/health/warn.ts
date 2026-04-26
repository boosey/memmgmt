import type { Entity } from "../entities";

/**
 * An entity warrants a "review this" warning when it came from a plugin
 * install but no author could be resolved — neither via frontmatter nor
 * via the plugin manifest.
 */
export function shouldWarn(entity: Entity): boolean {
  return entity.author === "unknown" && !!entity.plugin;
}
