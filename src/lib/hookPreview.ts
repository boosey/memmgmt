// Pure helper: render a hook entry as plain English for the HookEditor
// preview row. Uses the first non-blank line of the command, truncated to
// 60 characters so the preview stays on one line in the UI.

export type HookRunAs = "shell" | "script" | "claude-prompt";

export interface HookPreviewInput {
  event: string;
  matcher: string;
  runAs: HookRunAs;
  command: string;
}

const MAX_COMMAND_LEN = 60;

function firstNonBlankLine(cmd: string): string {
  for (const line of cmd.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function hookPreview(inp: HookPreviewInput): string {
  const matcher =
    inp.matcher && inp.matcher.length > 0 ? inp.matcher : "*";
  const head = `on ${inp.event} where tool matches ${matcher} · run ${inp.runAs}`;
  const firstLine = firstNonBlankLine(inp.command);
  if (!firstLine) return head;
  return `${head}: ${truncate(firstLine, MAX_COMMAND_LEN)}`;
}
