"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity, Relation } from "@/core/entities";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { FormRow, monoClass } from "./shared";
import { TYPE_LABELS } from "../typeLabels";
import type { TypedEditorProps } from "./editorTypes";

interface PluginEditorProps extends TypedEditorProps {
  relations?: readonly Relation[];
  allEntities?: readonly Entity[];
  onOpenEntity?: (e: Entity) => void;
}

type PluginShape = {
  name?: string;
  description?: string | null;
  author?: string | null;
  version?: string | null;
  raw?: Record<string, unknown>;
  source?: string;
  enabled?: boolean;
};

export function PluginEditor({
  entity,
  onApiReady,
  onTitleChange,
  relations = [],
  allEntities = [],
  onOpenEntity,
}: PluginEditorProps) {
  const initial = (entity.structured ?? {}) as PluginShape;
  const [name, setName] = useState(initial.name ?? entity.title);
  const [source, setSource] = useState(
    initial.source ?? (initial.raw?.repository as string) ?? "",
  );
  const [enabled, setEnabled] = useState<boolean>(initial.enabled ?? true);

  useEffect(() => {
    onTitleChange?.(name);
  }, [name, onTitleChange]);

  useEffect(() => {
    const baseRaw = { ...((initial.raw ?? {}) as Record<string, unknown>) };
    baseRaw.name = name;
    if (source) baseRaw.repository = source;
    onApiReady({
      currentTitle: name,
      getSerializedContent: () => buildNextContentFor(entity, baseRaw),
    });
  }, [name, source, enabled, entity, initial, onApiReady]);

  const provides = useMemo(
    () => relations.filter((r) => r.kind === "provides" && r.from === entity.id),
    [relations, entity.id],
  );

  const entById = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of allEntities) m.set(e.id, e);
    return m;
  }, [allEntities]);

  return (
    <div>
      <FormRow label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={monoClass()}
        />
      </FormRow>
      <FormRow
        label="Source"
        hint="Git URL, registry name, or local path."
      >
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={monoClass()}
        />
      </FormRow>
      <FormRow label="State">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="text-[12.5px] text-[color:var(--ink)]">
            Enabled ·{" "}
            {enabled
              ? "provides skills and commands to all sessions"
              : "disabled — entities below are not active"}
          </span>
        </label>
      </FormRow>

      <FormRow
        label={`Contains · ${provides.length}`}
        hint="Plugins don't have a body of their own — they provide other entities. Click to edit."
      >
        <div className="overflow-hidden rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)]">
          {provides.length === 0 && (
            <div className="px-[16px] py-[16px] text-[12px] text-[color:var(--text-faint)]">
              Nothing provided yet.
            </div>
          )}
          {provides.map((r, i) => {
            const child = entById.get(r.to);
            if (!child) return null;
            const typeLabel = TYPE_LABELS[child.type].label;
            return (
              <div
                key={r.to}
                data-testid="plugin-contains-row"
                className={[
                  "grid items-center gap-3 px-[12px] py-[8px]",
                  i > 0 ? "border-t border-[color:var(--rule-soft)]" : "",
                ].join(" ")}
                style={{ gridTemplateColumns: "90px 1fr auto" }}
              >
                <span className="smallcaps font-mono text-[10px] tracking-[0.14em] text-[color:var(--text-muted)]">
                  {typeLabel}
                </span>
                <span className="text-[13px] font-medium text-[color:var(--ink)]">
                  {child.title}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenEntity?.(child)}
                  className="cursor-pointer border-none bg-transparent font-mono text-[10.5px] text-[color:var(--text-muted)] underline"
                >
                  open →
                </button>
              </div>
            );
          })}
        </div>
      </FormRow>

      {entity.warn && (
        <div
          className="mt-[8px] rounded-sm px-[12px] py-[10px]"
          style={{
            border: "1px solid var(--semantic-error)",
            borderLeft: "3px solid var(--semantic-error)",
            background: "oklch(0.97 0.03 28)",
          }}
        >
          <div
            className="smallcaps mb-[3px] text-[10px] tracking-[0.18em]"
            style={{ color: "oklch(0.45 0.18 28)" }}
          >
            Warning
          </div>
          <div className="text-[12.5px] text-[color:var(--ink)]">
            No manifest author. Review its skills before trusting.
          </div>
        </div>
      )}
    </div>
  );
}
