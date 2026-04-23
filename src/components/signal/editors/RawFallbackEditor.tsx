"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Entity } from "@/core/entities";
import type { TypedEditorProps } from "./editorTypes";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-[12px] text-[color:var(--text-muted)]">
        Loading editor…
      </div>
    ),
  },
);

function inferLanguage(entity: Entity): string {
  if (entity.sourceFile.endsWith(".json")) return "json";
  if (entity.type === "mcp-server") return "json";
  return "markdown";
}

export function RawFallbackEditor({
  entity,
  onApiReady,
}: TypedEditorProps) {
  const [content, setContent] = useState(entity.rawContent);

  useEffect(() => {
    onApiReady({
      getSerializedContent: () => content,
    });
  }, [content, onApiReady]);

  const language = inferLanguage(entity);

  return (
    <div>
      <div
        data-testid="raw-fallback-banner"
        className="mb-[12px] rounded-sm px-[12px] py-[8px]"
        style={{
          border: "1px solid var(--rule)",
          borderLeft: "3px solid oklch(0.55 0.11 245)",
          background: "var(--paper)",
        }}
      >
        <div className="smallcaps mb-[2px] text-[10px] tracking-[0.18em] text-[color:var(--text-muted)]">
          Raw editor
        </div>
        <div className="text-[12.5px] leading-[1.5] text-[color:var(--ink)]">
          Structured editor lands in v1.8. For now, edit the file directly.
          Preview / Save / Undo still work.
        </div>
      </div>
      <div
        className="overflow-hidden rounded-sm border border-[color:var(--rule)]"
        style={{ height: 400 }}
      >
        <MonacoEditor
          value={content}
          language={language}
          theme="light"
          onChange={(v) => setContent(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
