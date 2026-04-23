"use client";
import { useEffect, useState } from "react";
import { buildNextContentFor } from "@/lib/buildNextContent";
import { FormRow, ecBtnClass, monoClass } from "./shared";
import type { TypedEditorProps } from "./editorTypes";

export function EnvVarEditor({ entity, onApiReady }: TypedEditorProps) {
  const sd = (entity.structured ?? {}) as { name?: string; value?: string };
  const [name, setName] = useState((sd.name ?? entity.title ?? "").toUpperCase());
  const [value, setValue] = useState(sd.value ?? entity.intent ?? "");
  const [secret, setSecret] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    onApiReady({
      currentTitle: name,
      getSerializedContent: () =>
        buildNextContentFor(entity, { name, value }),
    });
  }, [name, value, entity, onApiReady]);

  const reveaBtn = ecBtnClass();

  return (
    <div>
      <FormRow label="Variable">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          className={`${monoClass()} font-semibold`}
          style={{ letterSpacing: "0.04em" }}
        />
      </FormRow>
      <FormRow label="Value">
        <div className="flex gap-[6px]">
          <input
            type={secret && !reveal ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${monoClass()} flex-1`}
          />
          {secret && (
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className={reveaBtn.className}
              style={reveaBtn.style}
            >
              {reveal ? "hide" : "reveal"}
            </button>
          )}
        </div>
      </FormRow>
      <FormRow label="Flags">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={secret}
            onChange={(e) => setSecret(e.target.checked)}
          />
          <span className="text-[12.5px] text-[color:var(--ink)]">
            Mark as secret · value hidden by default, never printed in logs
          </span>
        </label>
      </FormRow>
    </div>
  );
}
