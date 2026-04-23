"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import type { ParsedSkill } from "@/core/parsers/skill";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { BodyEditor } from "./BodyEditor";
import { ToolAccessControl } from "./ToolAccessControl";
import { FormRow, fieldClass, monoClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

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

function structured(entity: Entity): ParsedSkill {
  return (
    (entity.structured as ParsedSkill) ?? {
      name: entity.title,
      description: entity.intent,
      author: null,
      body: "",
      extraFrontmatter: {},
    }
  );
}

export function SkillEditor({
  entity,
  onApiReady,
  onTitleChange,
}: TypedEditorProps) {
  const initial = useMemo(() => structured(entity), [entity]);
  const [name, setName] = useState(initial.name || entity.title);
  const [description, setDescription] = useState(initial.description || "");
  const [body, setBody] = useState(initial.body ?? "");

  // Tool access: if extraFrontmatter has a `tools` field, restrict.
  const initialToolsField = initial.extraFrontmatter?.tools;
  const initialMode: "inherit" | "restrict" =
    initialToolsField !== undefined ? "restrict" : "inherit";
  const initialTools: string[] = Array.isArray(initialToolsField)
    ? (initialToolsField as string[]).filter((t) => typeof t === "string")
    : [];
  const [mode, setMode] = useState<"inherit" | "restrict">(initialMode);
  const [tools, setTools] = useState<string[]>(initialTools);

  function toggleTool(t: string) {
    setTools((curr) =>
      curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t],
    );
  }

  useEffect(() => {
    onTitleChange?.(name);
  }, [name, onTitleChange]);

  useEffect(() => {
    const extra = { ...(initial.extraFrontmatter ?? {}) };
    if (mode === "restrict") extra.tools = tools;
    else delete extra.tools;
    const draft: ParsedSkill = {
      name,
      description,
      author: initial.author,
      body,
      extraFrontmatter: extra,
    };
    onApiReady({
      currentTitle: name,
      getSerializedContent: () => buildNextContentFor(entity, draft),
    });
  }, [name, description, body, mode, tools, entity, initial, onApiReady]);

  return (
    <div>
      <FormRow
        label="Name"
        note="folder name"
        hint="Used as the skill ID. Must be unique within scope."
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={monoClass()}
        />
      </FormRow>
      <FormRow
        label="Description"
        hint="One line. This is what Claude reads when deciding whether to invoke the skill."
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={fieldClass()}
        />
      </FormRow>
      <FormRow
        label="Tool access"
        hint="Which tools this skill may call while it is active."
      >
        <ToolAccessControl
          mode={mode}
          onModeChange={setMode}
          tools={tools}
          onToggle={toggleTool}
          allTools={ALL_TOOLS}
        />
      </FormRow>
      <FormRow
        label="Instructions"
        hint="Shown to Claude when the skill is active. Toggle Markdown to view/edit the raw file."
      >
        <BodyEditor
          value={body}
          onChange={setBody}
          allowMarkdownToggle
          unknownFields={
            Object.fromEntries(
              Object.entries(initial.extraFrontmatter ?? {}).filter(
                ([k]) => k !== "tools",
              ),
            ) as Record<string, unknown>
          }
        />
      </FormRow>
    </div>
  );
}
