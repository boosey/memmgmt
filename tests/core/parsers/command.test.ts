import { describe, it, expect } from "vitest";
import { parseCommand, serializeCommand } from "@/core/parsers/command";

const SAMPLE = `---
description: Greet the user
author: self
---
Say hello.`;

describe("command parser", () => {
  it("extracts description + author + body", () => {
    const parsed = parseCommand(SAMPLE);
    expect(parsed).toMatchObject({
      description: "Greet the user",
      author: "self",
      body: "Say hello.",
    });
  });

  it("round-trips", () => {
    const parsed = parseCommand(SAMPLE);
    expect(serializeCommand(parsed)).toBe(SAMPLE);
  });
});
