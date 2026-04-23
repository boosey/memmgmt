"use client";
import { useState } from "react";
import { ecBtnClass, monoClass } from "./shared";

interface ImportListProps {
  imports: string[];
  onChange: (next: string[]) => void;
  brokenPaths: ReadonlySet<string>;
}

export function ImportList({
  imports,
  onChange,
  brokenPaths,
}: ImportListProps) {
  const [newPath, setNewPath] = useState("");

  function addImport() {
    const p = newPath.trim();
    if (!p) return;
    const withAt = p.startsWith("@") ? p : `@${p}`;
    if (imports.includes(withAt)) return;
    onChange([...imports, withAt]);
    setNewPath("");
  }

  function remove(p: string) {
    onChange(imports.filter((x) => x !== p));
  }

  const addBtn = ecBtnClass();

  return (
    <div data-testid="import-list">
      {imports.length === 0 && (
        <div className="mb-[6px] text-[12px] text-[color:var(--text-faint)]">
          No imports.
        </div>
      )}
      {imports.map((p) => {
        const broken = brokenPaths.has(p);
        return (
          <div
            key={p}
            data-testid="import-row"
            data-broken={broken ? "true" : "false"}
            className="mb-[4px] flex items-center gap-2 rounded-sm px-[10px] py-[5px]"
            style={{
              border: broken
                ? "1px solid var(--semantic-error)"
                : "1px solid var(--rule-soft)",
              background: broken ? "oklch(0.97 0.03 28)" : "transparent",
            }}
          >
            <span className="flex-1 font-mono text-[11.5px] text-[color:var(--ink)]">
              {p}
            </span>
            {broken && (
              <span
                className="smallcaps text-[9px] tracking-[0.14em]"
                style={{ color: "var(--semantic-error)" }}
              >
                missing
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(p)}
              className="cursor-pointer border-none bg-transparent text-[14px] text-[color:var(--text-muted)]"
            >
              ×
            </button>
          </div>
        );
      })}
      <div className="mt-[6px] flex gap-2">
        <input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder="@path/to/file.md"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addImport();
            }
          }}
          className={`${monoClass()} flex-1`}
        />
        <button
          type="button"
          onClick={addImport}
          className={addBtn.className}
          style={addBtn.style}
        >
          add
        </button>
      </div>
    </div>
  );
}
