import { describe, it, expect } from "vitest";
import { isMemoryStale } from "@/core/health/stale";
import { STALE_THRESHOLD_MS } from "@/core/entities";
import type { Entity } from "@/core/entities";
import type { SlugMetadata } from "@/core/types";

function mem(partial: Partial<Entity>): Entity {
  return {
    id: "m",
    type: "memory",
    scope: "slug",
    author: "you",
    title: "",
    intent: "",
    sourceFile: "/abs/x.md",
    scopeRoot: "/abs",
    mtimeMs: 0,
    rawContent: "",
    ...partial,
  };
}

describe("isMemoryStale", () => {
  it("true when slug has been active more recently than mem by > threshold", () => {
    const e = mem({ slugRef: "s", mtimeMs: 0 });
    const slugs: SlugMetadata[] = [
      {
        slug: "s",
        projectPath: "/p",
        sessionCount: 1,
        lastActiveMs: STALE_THRESHOLD_MS + 1,
      },
    ];
    expect(isMemoryStale(e, slugs)).toBe(true);
  });

  it("false when delta is within threshold", () => {
    const e = mem({ slugRef: "s", mtimeMs: 0 });
    const slugs: SlugMetadata[] = [
      {
        slug: "s",
        projectPath: "/p",
        sessionCount: 1,
        lastActiveMs: STALE_THRESHOLD_MS - 1,
      },
    ];
    expect(isMemoryStale(e, slugs)).toBe(false);
  });

  it("false when slug has never been active (lastActiveMs = 0)", () => {
    const e = mem({ slugRef: "s", mtimeMs: 0 });
    const slugs: SlugMetadata[] = [
      { slug: "s", projectPath: "/p", sessionCount: 0, lastActiveMs: 0 },
    ];
    expect(isMemoryStale(e, slugs)).toBe(false);
  });

  it("false for non-memory entities", () => {
    const e = mem({ type: "skill", slugRef: "s" });
    const slugs: SlugMetadata[] = [
      {
        slug: "s",
        projectPath: "/p",
        sessionCount: 1,
        lastActiveMs: STALE_THRESHOLD_MS + 1,
      },
    ];
    expect(isMemoryStale(e, slugs)).toBe(false);
  });

  it("false when no slug metadata matches", () => {
    const e = mem({ slugRef: "missing", mtimeMs: 0 });
    expect(isMemoryStale(e, [])).toBe(false);
  });
});
