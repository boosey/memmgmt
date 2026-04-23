"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import type { ClaudeMdSection } from "@/core/parsers/claudeMd";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { BodyEditor } from "./BodyEditor";
import { ImportList } from "./ImportList";
import { FormRow, fieldClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

function structured(entity: Entity): ClaudeMdSection | null {
  return (entity.structured as ClaudeMdSection) ?? null;
}

export function StandingInstructionEditor({
  entity,
  onApiReady,
  onTitleChange,
}: TypedEditorProps) {
  const initial = useMemo(() => structured(entity), [entity]);
  const [heading, setHeading] = useState(initial?.heading || entity.title);
  const [body, setBody] = useState(initial?.body ?? "");
  const [imports, setImports] = useState<string[]>(entity.imports ?? []);

  const brokenPaths = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    onTitleChange?.(heading);
  }, [heading, onTitleChange]);

  useEffect(() => {
    const existingImports = new Set(
      (body.match(/@[\w/.-]+/g) ?? []).map((s) => s.trim()),
    );
    const extras = imports.filter((i) => !existingImports.has(i));
    const finalBody =
      extras.length > 0 ? `${body.trimEnd()}\n\n${extras.join("\n")}\n` : body;
    onApiReady({
      currentTitle: heading,
      getSerializedContent: () =>
        buildNextContentFor(entity, {
          heading,
          body: finalBody,
        }),
    });
  }, [heading, body, imports, entity, onApiReady]);

  return (
    <div>
      <FormRow
        label="Heading"
        hint="Rendered as an H2 in CLAUDE.md. Keep short; Claude reads these as anchors."
      >
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className={fieldClass()}
        />
      </FormRow>
      <FormRow
        label="Body"
        hint="This section body. Toggle Markdown to view or edit the raw source."
      >
        <BodyEditor value={body} onChange={setBody} allowMarkdownToggle />
      </FormRow>
      <FormRow
        label="Imports"
        hint="@-references to other files merged into this section."
      >
        <ImportList
          imports={imports}
          onChange={setImports}
          brokenPaths={brokenPaths}
        />
      </FormRow>
    </div>
  );
}
