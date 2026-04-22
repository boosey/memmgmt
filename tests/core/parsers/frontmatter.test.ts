import { describe, it, expect } from "vitest";
import { splitFrontmatter, joinFrontmatter } from "@/core/parsers/frontmatter";

describe("frontmatter", () => {
  it("splits frontmatter + body", () => {
    const src = "---\nname: x\n---\nhello";
    expect(splitFrontmatter(src)).toEqual({
      frontmatter: { name: "x" },
      body: "hello",
    });
  });

  it("returns empty frontmatter if none", () => {
    expect(splitFrontmatter("just body")).toEqual({
      frontmatter: {},
      body: "just body",
    });
  });

  it("round-trips", () => {
    const src = "---\nname: x\ndescription: y\n---\nhello\n";
    const parsed = splitFrontmatter(src);
    const back = joinFrontmatter(parsed.frontmatter, parsed.body);
    expect(splitFrontmatter(back)).toEqual(parsed);
  });
});
