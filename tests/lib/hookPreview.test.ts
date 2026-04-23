import { describe, it, expect } from "vitest";
import { hookPreview } from "@/lib/hookPreview";

describe("hookPreview", () => {
  it("renders event, matcher, runAs, and first command line", () => {
    expect(
      hookPreview({
        event: "PreToolUse",
        matcher: "*",
        runAs: "shell",
        command: "echo hello",
      }),
    ).toBe("on PreToolUse where tool matches * · run shell: echo hello");
  });

  it("substitutes * when matcher is empty", () => {
    expect(
      hookPreview({
        event: "PostToolUse",
        matcher: "",
        runAs: "script",
        command: "npm run check",
      }),
    ).toBe("on PostToolUse where tool matches * · run script: npm run check");
  });

  it("uses the first non-blank line of a multi-line command", () => {
    expect(
      hookPreview({
        event: "UserPromptSubmit",
        matcher: "Bash",
        runAs: "shell",
        command: "\n\n   \n  real-command.sh\nsecond line\n",
      }),
    ).toBe(
      "on UserPromptSubmit where tool matches Bash · run shell: real-command.sh",
    );
  });

  it("truncates long command lines to 60 chars with an ellipsis", () => {
    const long = "echo " + "x".repeat(120);
    const out = hookPreview({
      event: "PreToolUse",
      matcher: "*",
      runAs: "shell",
      command: long,
    });
    const commandPortion = out.split("run shell: ")[1]!;
    expect(commandPortion.length).toBeLessThanOrEqual(60);
    expect(commandPortion.endsWith("…")).toBe(true);
  });

  it("omits the command segment entirely when command is blank", () => {
    expect(
      hookPreview({
        event: "PreToolUse",
        matcher: "*",
        runAs: "shell",
        command: "   \n\n  \n",
      }),
    ).toBe("on PreToolUse where tool matches * · run shell");
  });

  it("surfaces each runAs verbatim", () => {
    for (const runAs of ["shell", "script", "claude-prompt"] as const) {
      const out = hookPreview({
        event: "Stop",
        matcher: "*",
        runAs,
        command: "noop",
      });
      expect(out).toContain(`run ${runAs}`);
    }
  });
});
