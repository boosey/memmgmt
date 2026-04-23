import { describe, it, expect } from "vitest";
import { parseAgent, serializeAgent } from "@/core/parsers/agent";

const SAMPLE = `---
name: code-reviewer
description: Reviews a diff.
tools:
  - Read
  - Grep
model: opus
---
You are a code reviewer.
`;

describe("agent parser", () => {
  it("extracts name, description, tools, model, body", () => {
    const parsed = parseAgent(SAMPLE);
    expect(parsed.name).toBe("code-reviewer");
    expect(parsed.description).toBe("Reviews a diff.");
    expect(parsed.tools).toEqual(["Read", "Grep"]);
    expect(parsed.model).toBe("opus");
    expect(parsed.body.trim()).toBe("You are a code reviewer.");
  });

  it("accepts comma-separated tools string", () => {
    const src = `---\nname: x\ndescription: y\ntools: Read, Grep, Bash\n---\nbody`;
    expect(parseAgent(src).tools).toEqual(["Read", "Grep", "Bash"]);
  });

  it("preserves unknown frontmatter fields through round-trip", () => {
    const src = `---
name: x
description: y
tools:
  - Read
customField: keep-me
nested:
  a: 1
---
body
`;
    const parsed = parseAgent(src);
    expect(parsed.extraFrontmatter).toMatchObject({
      customField: "keep-me",
      nested: { a: 1 },
    });
    const out = serializeAgent(parsed);
    expect(out).toContain("customField: keep-me");
    expect(out).toContain("nested:");
  });

  it("round-trips a minimal agent", () => {
    const src = `---\nname: x\ndescription: y\n---\nbody`;
    const parsed = parseAgent(src);
    const out = serializeAgent(parsed);
    const reparsed = parseAgent(out);
    expect(reparsed.name).toBe("x");
    expect(reparsed.description).toBe("y");
    expect(reparsed.body.trim()).toBe("body");
  });
});
