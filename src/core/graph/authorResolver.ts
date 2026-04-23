import type { Scope } from "../types";
import type { AuthorBucket } from "../entities";

export interface ResolveInput {
  scope: Scope;
  frontmatterAuthor: string | null;
  pluginManifest: { author: string | null; publisher: string | null } | null;
}

export interface ResolvedAuthor {
  author: string | null;
  publisher: string | null;
  isOfficial: boolean;
}

const ANTHROPIC_RE = /^anthropic(\s|,|$)/i;

function isAnthropicPublisher(publisher: string | null): boolean {
  return publisher != null && publisher.toLowerCase() === "anthropic";
}

export function resolveAuthor(input: ResolveInput): ResolvedAuthor {
  if (input.frontmatterAuthor) {
    const author = input.frontmatterAuthor;
    const publisher = input.pluginManifest?.publisher ?? null;
    return {
      author,
      publisher,
      isOfficial: ANTHROPIC_RE.test(author) || isAnthropicPublisher(publisher),
    };
  }

  if (input.scope === "plugin") {
    const mf = input.pluginManifest;
    if (mf && (mf.author || mf.publisher)) {
      const isOfficial =
        (mf.author != null && ANTHROPIC_RE.test(mf.author)) ||
        isAnthropicPublisher(mf.publisher);
      return {
        author: mf.author ?? null,
        publisher: mf.publisher ?? null,
        isOfficial,
      };
    }
    return { author: null, publisher: null, isOfficial: false };
  }

  return { author: "self", publisher: null, isOfficial: false };
}

/**
 * Collapse a ResolvedAuthor + Scope into a UI-facing provenance bucket.
 *
 *   anthropic → resolved.isOfficial OR author starts with /anthropic/i
 *   you       → author === 'self' OR (author === null AND scope !== 'plugin')
 *   unknown   → author === null AND scope === 'plugin'
 *   community → everyone else
 */
export function authorBucket(
  resolved: ResolvedAuthor,
  scope: Scope,
): AuthorBucket {
  if (
    resolved.isOfficial ||
    (resolved.author != null && ANTHROPIC_RE.test(resolved.author))
  ) {
    return "anthropic";
  }
  if (resolved.author === "self") return "you";
  if (resolved.author === null) {
    return scope === "plugin" ? "unknown" : "you";
  }
  return "community";
}
