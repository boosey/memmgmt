"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import type { ParsedCommand } from "@/core/parsers/command";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { BodyEditor } from "./BodyEditor";
import { ConvertToSkill } from "./ConvertToSkill";
import { FormRow, fieldClass, monoClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

function structured(entity: Entity): ParsedCommand {
  return (
    (entity.structured as ParsedCommand) ?? {
      description: entity.intent,
      author: null,
      enabled: true,
      body: "",
      extraFrontmatter: {},
    }
  );
}

interface CommandEditorProps extends TypedEditorProps {
  onConverted?: () => void;
}

export function CommandEditor({
  entity,
  onApiReady,
  onTitleChange,
  onConverted,
}: CommandEditorProps) {
  const initial = useMemo(() => structured(entity), [entity]);

  // Command name comes from the filename stem — entity.title has the `/` prefix.
  const stripped = (entity.title ?? "").replace(/^\//, "");
  const [name, setName] = useState(stripped);
  const [description, setDescription] = useState(initial.description);
  const [enabled, setEnabled] = useState(initial.enabled !== false);
  const [args, setArgs] = useState<string>(
    ((initial.extraFrontmatter?.["argument-hint"] as string | undefined) ??
      "$ARGUMENTS"),
  );
  const [body, setBody] = useState(initial.body ?? "");

  useEffect(() => {
    onTitleChange?.(name);
  }, [name, onTitleChange]);

  useEffect(() => {
    const extra = { ...(initial.extraFrontmatter ?? {}) };
    if (args && args.length > 0) extra["argument-hint"] = args;
    const draft: ParsedCommand = {
      description,
      author: initial.author,
      enabled,
      body,
      extraFrontmatter: extra,
    };
    onApiReady({
      currentTitle: name,
      getSerializedContent: () => buildNextContentFor(entity, draft),
    });
  }, [name, description, enabled, args, body, entity, initial, onApiReady]);

  return (
    <div>
      <FormRow
        label="Name"
        note="invoked as /name"
        hint="Slash-command identifier. Used as the filename."
      >
        <div className="flex items-center overflow-hidden rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)]">
          <span
            className="border-r border-[color:var(--rule)] bg-[color:var(--paper-deep)] px-[10px] py-2 font-mono text-[12.5px] text-[color:var(--text-muted)]"
          >
            /
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border-none bg-transparent px-[10px] py-2 font-mono text-[12.5px] text-[color:var(--ink)] outline-none"
          />
        </div>
      </FormRow>
      <FormRow label="State">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!!entity.plugin}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="text-[12.5px] text-[color:var(--ink)]">
            Enabled · {enabled ? "Active" : "Disabled (Claude will not see this command)"}
            {!!entity.plugin && " · Controlled by plugin state"}
          </span>
        </label>
      </FormRow>
      <FormRow
        label="Description"
        hint="One line. Shown in the command-palette list."
      >
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldClass()}
        />
      </FormRow>
      <FormRow
        label="Arguments"
        hint="Reference user-typed arguments as $ARGUMENTS inside the prompt body."
      >
        <input
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          className={monoClass()}
        />
      </FormRow>
      <FormRow
        label="Prompt body"
        hint="Sent to Claude when the user runs this command. Toggle Markdown for raw source."
      >
        <BodyEditor
          value={body}
          onChange={setBody}
          allowMarkdownToggle
          unknownFields={
            Object.fromEntries(
              Object.entries(initial.extraFrontmatter ?? {}).filter(
                ([k]) => k !== "argument-hint",
              ),
            ) as Record<string, unknown>
          }
        />
      </FormRow>

      <ConvertToSkill
        command={entity}
        onConverted={() => onConverted?.()}
      />
    </div>
  );
}
