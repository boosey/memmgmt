"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { FormRow, monoClass, ecBtnClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

function structured(entity: Entity): string[] {
  return (entity.structured as { plugins: string[] })?.plugins ?? [];
}

export function EnabledPluginsEditor({
  entity,
  onApiReady,
  onTitleChange,
}: TypedEditorProps) {
  const initial = useMemo(() => structured(entity), [entity]);
  const [plugins, setPlugins] = useState<string[]>(initial);

  useEffect(() => {
    onTitleChange?.("Enabled Plugins");
  }, [onTitleChange]);

  useEffect(() => {
    onApiReady({
      currentTitle: "Enabled Plugins",
      getSerializedContent: () =>
        buildNextContentFor(entity, {
          plugins,
        }),
    });
  }, [plugins, entity, onApiReady]);

  const btn = ecBtnClass();

  return (
    <div className="flex flex-col gap-4">
      <FormRow
        label="Plugin Names"
        hint="Plugins listed here are active in Claude Code. One per line."
      >
        <div className="flex flex-col gap-2">
          {plugins.map((name, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={name}
                onChange={(e) =>
                  setPlugins((curr) =>
                    curr.map((p, j) => (i === j ? e.target.value : p)),
                  )
                }
                className={`${monoClass()} flex-1`}
              />
              <button
                type="button"
                onClick={() => setPlugins((curr) => curr.filter((_, j) => i !== j))}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--ink)]"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPlugins((curr) => [...curr, ""])}
            className={btn.className}
            style={btn.style}
          >
            + Add plugin
          </button>
        </div>
      </FormRow>
    </div>
  );
}
