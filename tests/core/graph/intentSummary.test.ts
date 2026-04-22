import { describe, it, expect } from "vitest";
import { deriveIntentSummary } from "@/core/graph/intentSummary";

describe("intentSummary", () => {
  it("uses frontmatter description when present", () => {
    expect(
      deriveIntentSummary({
        kind: "skill",
        structuredData: { description: "Greet users" },
        rawContent: "",
      }),
    ).toBe("Greet users");
  });

  it("falls back to first sentence of body truncated to 120 chars", () => {
    const long = "This is the first sentence. " + "x".repeat(200);
    expect(
      deriveIntentSummary({
        kind: "claude-md-section",
        structuredData: { body: long },
        rawContent: "",
      }),
    ).toBe("This is the first sentence.");
  });

  it("produces a label for settings permission entries", () => {
    expect(
      deriveIntentSummary({
        kind: "settings-entry",
        structuredData: {
          kind: "permission",
          entryKey: "permissions.allow[0]",
          value: "Bash(git *)",
        },
        rawContent: "",
      }),
    ).toBe('permissions.allow[0] → "Bash(git *)"');
  });
});
