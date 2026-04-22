import { describe, it, expect } from "vitest";
import { slugToPath, pathToSlug } from "@/core/discovery/slugCodec";

describe("slugCodec", () => {
  it("decodes Windows-style slugs to absolute paths", () => {
    expect(slugToPath("C--Users-boose-projects-memmgmt")).toBe(
      "C:\\Users\\boose\\projects\\memmgmt",
    );
  });

  it("decodes POSIX-style slugs", () => {
    expect(slugToPath("-Users-alice-code-proj")).toBe("/Users/alice/code/proj");
  });

  it("round-trips POSIX paths", () => {
    const slug = pathToSlug("/Users/alice/code/proj");
    expect(slugToPath(slug)).toBe("/Users/alice/code/proj");
  });

  it("round-trips Windows paths", () => {
    const slug = pathToSlug("C:\\Users\\boose\\projects\\memmgmt");
    expect(slugToPath(slug)).toBe("C:\\Users\\boose\\projects\\memmgmt");
  });

  it("handles dashes inside path segments via escaped double-dash", () => {
    const slug = pathToSlug("/opt/my-tool/sub");
    expect(slugToPath(slug)).toBe("/opt/my-tool/sub");
  });
});
