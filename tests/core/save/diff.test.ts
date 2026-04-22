import { describe, it, expect } from "vitest";
import { computeDiff } from "@/core/save/diff";

describe("computeDiff", () => {
  it("returns no-op flag when equal", () => {
    expect(computeDiff("a\n", "a\n").noop).toBe(true);
  });

  it("returns hunks for simple line change", () => {
    const d = computeDiff("a\nb\nc\n", "a\nB\nc\n");
    expect(d.noop).toBe(false);
    expect(d.hunks.length).toBe(1);
  });
});
