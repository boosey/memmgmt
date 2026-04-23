"use client";
import { Chip } from "./shared";

interface ToolAccessControlProps {
  mode: "inherit" | "restrict";
  onModeChange: (m: "inherit" | "restrict") => void;
  tools: string[];
  onToggle: (tool: string) => void;
  allTools: readonly string[];
}

const DEFAULT_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  "Task",
] as const;

export function ToolAccessControl({
  mode,
  onModeChange,
  tools,
  onToggle,
  allTools = DEFAULT_TOOLS,
}: ToolAccessControlProps) {
  return (
    <div data-testid="tool-access-control">
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            checked={mode === "inherit"}
            onChange={() => onModeChange("inherit")}
            className="mt-[3px]"
          />
          <div>
            <div className="text-[13px] font-medium text-[color:var(--ink)]">
              Inherit — all tools allowed
            </div>
            <div className="text-[11.5px] leading-[1.4] text-[color:var(--text-faint)]">
              Skill can use any tool permitted at the session level.
            </div>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            checked={mode === "restrict"}
            onChange={() => onModeChange("restrict")}
            className="mt-[3px]"
          />
          <div className="flex-1">
            <div className="text-[13px] font-medium text-[color:var(--ink)]">
              Restrict to selected tools
            </div>
            <div className="text-[11.5px] leading-[1.4] text-[color:var(--text-faint)]">
              Only the tools checked below are available. Everything else is
              blocked.
            </div>
          </div>
        </label>
      </div>
      {mode === "restrict" && (
        <div className="mt-[10px] rounded-sm border border-[color:var(--rule-soft)] bg-[color:var(--paper)] px-[12px] py-[10px]">
          <div className="flex flex-wrap gap-[6px]">
            {allTools.map((t) => (
              <Chip
                key={t}
                label={t}
                active={tools.includes(t)}
                onClick={() => onToggle(t)}
              />
            ))}
          </div>
          {tools.length === 0 && (
            <div
              className="mt-2 text-[11.5px]"
              style={{ color: "var(--semantic-error)" }}
            >
              No tools selected — skill will have no tool access at all.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
