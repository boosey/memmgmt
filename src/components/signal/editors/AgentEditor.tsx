"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import { serializeAgent, type ParsedAgent } from "@/core/parsers/agent";
import { BodyEditor } from "./BodyEditor";
import { ToolAccessControl } from "./ToolAccessControl";
import { FormRow, fieldClass, monoClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

function structured(entity: Entity): ParsedAgent | null {
  return (entity.structured as ParsedAgent) ?? null;
}

const ALL_TOOLS = [
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

export function AgentEditor({
  entity,
  onApiReady,
  onTitleChange,
}: TypedEditorProps) {
  const initial = useMemo(() => structured(entity), [entity]);
  const [name, setName] = useState(initial?.name || entity.title);
  const [desc, setDesc] = useState(initial?.description || entity.intent);
  const [model, setModel] = useState(initial?.model || "");
  const [tools, setTools] = useState<string[]>(initial?.tools || []);
  const [toolMode, setToolMode] = useState<"inherit" | "restrict">(
    initial?.tools && initial.tools.length > 0 ? "restrict" : "inherit",
  );
  const [body, setBody] = useState(initial?.body ?? "");

  useEffect(() => {
    onTitleChange?.(name);
  }, [name, onTitleChange]);

  useEffect(() => {
    onApiReady({
      currentTitle: name,
      getSerializedContent: () =>
        serializeAgent({
          name,
          description: desc,
          tools: toolMode === "inherit" ? [] : tools,
          model: model || null,
          author: initial?.author ?? null,
          body,
          extraFrontmatter: initial?.extraFrontmatter ?? {},
        }),
    });
  }, [name, desc, model, tools, toolMode, body, initial, onApiReady]);

  return (
    <div className="flex flex-col gap-4">
      <FormRow
        label="Name"
        note="folder name"
        hint="Used as the agent ID. Must be unique within scope."
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={monoClass()}
        />
      </FormRow>

      <FormRow
        label="Description"
        hint="One line. This is what Claude reads when deciding whether to invoke the agent."
      >
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          className={fieldClass()}
        />
      </FormRow>

      <FormRow
        label="Model"
        hint="Optional. Specify a preferred model for this agent (e.g. claude-3-opus-20240229)."
      >
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="claude-3-5-sonnet-latest"
          className={fieldClass()}
        />
      </FormRow>

      <FormRow
        label="Tool access"
        hint="Which tools this agent may call while it is active."
      >
        <ToolAccessControl
          mode={toolMode}
          onModeChange={setToolMode}
          tools={tools}
          onToggle={(t) =>
            setTools((curr) =>
              curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t],
            )
          }
          allTools={ALL_TOOLS}
        />
      </FormRow>

      <FormRow
        label="Instructions"
        hint="Detailed instructions for this agent. Toggle Markdown to view/edit the raw file."
      >
        <BodyEditor value={body} onChange={setBody} allowMarkdownToggle />
      </FormRow>
    </div>
  );
}
