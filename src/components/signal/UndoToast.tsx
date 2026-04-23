"use client";
import { toast, Toaster } from "sonner";

export interface UndoPayload {
  sourceFile: string;
  scopeRoot: string;
  label?: string;
}

export function showUndoToast(
  payload: UndoPayload,
  onUndone?: () => void,
): void {
  const label = payload.label ?? "Saved with backup";
  toast(label, {
    description: payload.sourceFile,
    duration: 8000,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          const r = await fetch("/api/undo", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sourceFile: payload.sourceFile,
              scopeRoot: payload.scopeRoot,
            }),
          });
          const j = await r.json();
          if (j.ok) {
            toast.success("Undone", {
              description: payload.sourceFile,
              duration: 3000,
            });
            onUndone?.();
          } else {
            toast.error("Undo failed", {
              description: String(j.reason ?? "unknown"),
            });
          }
        } catch (e) {
          toast.error("Undo failed", { description: String(e) });
        }
      },
    },
  });
}

export function UndoToaster() {
  return <Toaster position="bottom-right" richColors closeButton />;
}
