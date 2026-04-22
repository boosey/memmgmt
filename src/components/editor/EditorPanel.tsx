"use client";
import { useArtifact } from "@/hooks/useArtifact";
import { StructuredEditor } from "./StructuredEditor";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { MonacoEscapeHatch } from "./MonacoEscapeHatch";
import { buildNextContent } from "@/lib/serializeByKind";
import { useSave } from "@/hooks/useSave";
import { DiffPreviewModal } from "./DiffPreviewModal";
import type { ArtifactNode } from "@/core/types";

const EDITABLE_KINDS = new Set([
  "claude-md-section",
  "settings-entry",
  "skill",
]);

export function EditorPanel({
  id,
  onClose,
  onSaved,
}: {
  id: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { node, loading } = useArtifact(id);
  const [showRaw, setShowRaw] = useState(false);
  const [draft, setDraft] = useState<unknown>(undefined);
  const [nextContent, setNextContent] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<ArtifactNode | null>(null);

  const { save, undo, pending } = useSave();

  useEffect(() => {
    setDraft(undefined);
    setShowRaw(false);
    setDiffOpen(false);
    setNextContent(null);
    setSaveError(null);
    setJustSaved(null);
  }, [id]);

  const editable = useMemo(
    () => (node ? EDITABLE_KINDS.has(node.kind) : false),
    [node],
  );

  if (!id) return null;

  function handleOpenDiff() {
    if (!node) return;
    try {
      const effectiveDraft = draft ?? node.structuredData;
      const next = buildNextContent(node, effectiveDraft);
      setNextContent(next);
      setDiffOpen(true);
      setSaveError(null);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  async function handleConfirm() {
    if (!node || nextContent == null) return;
    const res = await save({
      sourceFile: node.sourceFile,
      scopeRoot: node.scopeRoot,
      nextContent,
      expectedMtimeMs: node.mtimeMs,
    });
    if (res.ok) {
      setJustSaved(node);
      setDiffOpen(false);
      setDraft(undefined);
      setNextContent(null);
      onSaved?.();
    } else {
      setSaveError(res.reason);
    }
  }

  async function handleUndo() {
    if (!justSaved) return;
    await undo({
      sourceFile: justSaved.sourceFile,
      scopeRoot: justSaved.scopeRoot,
    });
    setJustSaved(null);
    onSaved?.();
    location.reload();
  }

  const isDirty = draft !== undefined;

  return (
    <aside className="fixed top-12 right-0 bottom-0 w-[420px] bg-white border-l border-neutral-200 shadow-xl z-20 flex flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <div className="font-medium text-sm truncate">{node?.title ?? "…"}</div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setShowRaw((s) => !s)}
        >
          {showRaw ? "Structured" : "Raw"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          ✕
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-3">
        {loading && <div className="text-neutral-500">Loading…</div>}
        {node && !showRaw && (
          <StructuredEditor
            node={node}
            draft={draft}
            onChange={editable ? setDraft : undefined}
            readOnly={!editable}
          />
        )}
        {node && showRaw && (
          <MonacoEscapeHatch value={node.rawContent} readOnly />
        )}
      </div>
      {node && editable && (
        <footer className="flex items-center gap-2 border-t px-4 py-2 text-xs">
          <div className="text-neutral-500">
            {isDirty ? "unsaved changes" : "no changes"}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setDraft(undefined)}
            disabled={!isDirty}
          >
            Revert
          </Button>
          <Button size="sm" onClick={handleOpenDiff} disabled={!isDirty}>
            Preview save
          </Button>
        </footer>
      )}
      {saveError && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          Save failed: {saveError}
          {saveError === "mtime-mismatch" && (
            <>
              {" "}
              — the file changed on disk. Close and reopen this panel to reload.
            </>
          )}
        </div>
      )}
      {diffOpen && node && nextContent != null && (
        <DiffPreviewModal
          before={node.rawContent}
          after={nextContent}
          pending={pending}
          onCancel={() => setDiffOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
      {justSaved && (
        <div className="absolute bottom-16 left-4 right-4 bg-black text-white text-xs px-3 py-2 rounded flex items-center gap-3">
          <span>Saved.</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-white hover:bg-white/10"
            onClick={handleUndo}
          >
            Undo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => setJustSaved(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </aside>
  );
}
