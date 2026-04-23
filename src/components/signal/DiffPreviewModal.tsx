"use client";
import dynamic from "next/dynamic";
import { ecBtnClass } from "./editors/shared";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false, loading: () => <div className="p-4 text-[12px] text-[color:var(--text-muted)]">Loading diff…</div> },
);

interface DiffPreviewModalProps {
  open: boolean;
  title?: string;
  before: string;
  after: string;
  language?: string;
  onClose: () => void;
  noop?: boolean;
}

export function DiffPreviewModal({
  open,
  title = "Preview diff",
  before,
  after,
  language,
  onClose,
  noop,
}: DiffPreviewModalProps) {
  if (!open) return null;
  const close = ecBtnClass();

  return (
    <div
      data-testid="diff-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-[90vw] max-w-[1100px] flex-col overflow-hidden rounded-sm border border-[color:var(--ink)] bg-[color:var(--paper)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--rule)] px-5 py-3">
          <span className="smallcaps text-[10px] tracking-[0.2em] text-[color:var(--text-muted)]">
            Preview
          </span>
          <span className="text-[15px] font-semibold text-[color:var(--ink)]">
            {title}
          </span>
          <span className="flex-1" />
          {noop && (
            <span
              className="smallcaps text-[10px] tracking-[0.14em]"
              style={{ color: "var(--semantic-warn)" }}
            >
              no-op · file unchanged
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className={close.className}
            style={close.style}
          >
            close
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <DiffEditor
            original={before}
            modified={after}
            language={language ?? "markdown"}
            theme="light"
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
