"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import { hookPreview, type HookRunAs } from "@/lib/hookPreview";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { Chip, FormRow, monoClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

const EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "SubagentStop",
  "SessionStart",
  "SessionEnd",
  "Notification",
] as const;

const RUN_AS: readonly HookRunAs[] = ["shell", "script", "claude-prompt"];

type HookShape = {
  event?: string;
  matcher?: string;
  hooks?: Array<{ type?: string; command?: string }>;
};

function initialState(entity: Entity) {
  const sd = (entity.structured ?? {}) as HookShape;
  const first = sd.hooks?.[0] ?? {};
  let runAs: HookRunAs = "shell";
  if (first.type === "command") runAs = "shell";
  else if (first.type === "prompt") runAs = "claude-prompt";
  else if (first.type === "script") runAs = "script";
  return {
    event: sd.event ?? "PreToolUse",
    matcher: sd.matcher ?? "*",
    runAs,
    command: first.command ?? "",
  };
}

export function HookEditor({ entity, onApiReady }: TypedEditorProps) {
  const init = useMemo(() => initialState(entity), [entity]);
  const [event, setEvent] = useState(init.event);
  const [matcher, setMatcher] = useState(init.matcher);
  const [runAs, setRunAs] = useState<HookRunAs>(init.runAs);
  const [command, setCommand] = useState(init.command);

  const preview = hookPreview({ event, matcher, runAs, command });

  useEffect(() => {
    onApiReady({
      getSerializedContent: () => {
        const type =
          runAs === "claude-prompt" ? "prompt" : runAs === "script" ? "script" : "command";
        const hookEntry = { type, command };
        return buildNextContentFor(entity, {
          event,
          matcher,
          hooks: [hookEntry],
        });
      },
    });
  }, [event, matcher, runAs, command, entity, onApiReady]);

  return (
    <div>
      <FormRow label="Event" hint="When this hook fires in the agent loop.">
        <div className="flex flex-wrap gap-[6px]">
          {EVENTS.map((e) => (
            <Chip
              key={e}
              label={e}
              active={event === e}
              onClick={() => setEvent(e)}
            />
          ))}
        </div>
      </FormRow>
      <FormRow
        label="Matcher"
        hint="For tool events: glob against tool name. Use * to match all."
      >
        <input
          value={matcher}
          onChange={(e) => setMatcher(e.target.value)}
          placeholder="Write, Edit, Bash(git:*)"
          className={monoClass()}
        />
      </FormRow>
      <FormRow label="Run as">
        <div className="flex gap-[6px]">
          {RUN_AS.map((r) => (
            <Chip
              key={r}
              label={r}
              active={runAs === r}
              onClick={() => setRunAs(r)}
            />
          ))}
        </div>
      </FormRow>
      <FormRow
        label="Command"
        hint="Available variables: $TOOL_NAME, $TOOL_ARGS, $FILE, $SESSION_ID."
      >
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          rows={4}
          className={monoClass()}
        />
      </FormRow>
      <div
        data-testid="hook-preview"
        className="rounded-sm border border-dashed border-[color:var(--rule)] bg-[color:var(--paper)] px-[12px] py-[10px]"
      >
        <div className="smallcaps mb-[4px] text-[10px] tracking-[0.14em] text-[color:var(--text-muted)]">
          Preview
        </div>
        <div className="font-mono text-[12px] leading-[1.5] text-[color:var(--ink)]">
          {preview}
        </div>
      </div>
    </div>
  );
}
