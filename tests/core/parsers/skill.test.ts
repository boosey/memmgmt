import { describe, it, expect } from "vitest";
import { parseSkill, serializeSkill } from "@/core/parsers/skill";

const SAMPLE = `---
name: demo
description: Demo skill
author: Acme
---
Body goes here.`;

describe("skill parser", () => {
  it("extracts name, description, author", () => {
    const parsed = parseSkill(SAMPLE);
    expect(parsed).toMatchObject({
      name: "demo",
      description: "Demo skill",
      author: "Acme",
    });
  });

  it("round-trips", () => {
    const parsed = parseSkill(SAMPLE);
    expect(serializeSkill(parsed)).toBe(SAMPLE);
  });

  it("treats author=null when absent", () => {
    const parsed = parseSkill(`---\nname: x\ndescription: y\n---\nbody`);
    expect(parsed.author).toBeNull();
  });
});
