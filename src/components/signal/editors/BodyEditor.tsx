"use client";
import { useState } from "react";

interface BodyEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowMarkdownToggle?: boolean;
  unknownFields?: Record<string, unknown>;
  rows?: number;
}

const TOOLBAR = ["B", "I", "H", "•", "1.", ">", "</>", "@link"] as const;

export function BodyEditor({
  value,
  onChange,
  placeholder,
  allowMarkdownToggle,
  unknownFields,
  rows = 8,
}: BodyEditorProps) {
  const [mode, setMode] = useState<"form" | "markdown">("form");
  const unknownEntries = Object.entries(unknownFields ?? {});
  const unknownCount = unknownEntries.length;

  function insertWrap(l: string, r: string) {
    onChange(value + l + r);
  }

  function handleToolbar(t: string) {
    switch (t) {
      case "B":
        return insertWrap("**", "**");
      case "I":
        return insertWrap("_", "_");
      case "H":
        return insertWrap("\n## ", "");
      case "•":
        return insertWrap("\n- ", "");
      case "1.":
        return insertWrap("\n1. ", "");
      case ">":
        return insertWrap("\n> ", "");
      case "</>":
        return insertWrap("`", "`");
      case "@link":
        return insertWrap("@", "");
    }
  }

  return (
    <div
      data-testid="body-editor"
      className="overflow-hidden rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)]"
    >
      <div className="flex items-center gap-[14px] border-b border-[color:var(--rule-soft)] px-[10px] py-[6px]">
        {TOOLBAR.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => handleToolbar(t)}
            className={[
              "cursor-pointer border-none bg-transparent text-[12px] text-[color:var(--text-muted)]",
              t === "</>" ? "font-mono" : "",
              i === 0 ? "font-bold" : "",
              i === 1 ? "italic" : "",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
        {allowMarkdownToggle && (
          <>
            <span className="flex-1" />
            <div className="flex overflow-hidden rounded-sm border border-[color:var(--rule)]">
              {(
                [
                  ["form", "Form"],
                  ["markdown", "Markdown"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMode(k)}
                  className={[
                    "cursor-pointer border-none px-[9px] py-[3px] text-[10.5px] font-medium tracking-[0.06em]",
                    mode === k
                      ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                      : "bg-transparent text-[color:var(--text-muted)]",
                  ].join(" ")}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {mode === "form" ? (
        <textarea
          data-testid="body-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="block w-full resize-y border-none bg-transparent px-[14px] py-[12px] text-[13.5px] leading-[1.5] text-[color:var(--ink)] outline-none"
        />
      ) : (
        <pre className="m-0 overflow-auto whitespace-pre-wrap px-[14px] py-[12px] font-mono text-[12px] leading-[1.6] text-[color:var(--ink)]">
          {value}
        </pre>
      )}
      {unknownCount > 0 && (
        <div
          data-testid="body-editor-unknown"
          title={unknownEntries
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join("\n")}
          className="border-t border-[color:var(--rule-soft)] px-[12px] py-[6px] font-mono text-[10px] text-[color:var(--text-faint)]"
        >
          {unknownCount} unknown frontmatter field
          {unknownCount === 1 ? "" : "s"} preserved:{" "}
          {unknownEntries.map(([k]) => k).join(", ")}
        </div>
      )}
    </div>
  );
}
