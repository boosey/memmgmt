"use client";
import { Button } from "@/components/ui/button";

export function DiffPreviewModal({
  before,
  after,
  onConfirm,
  onCancel,
  pending,
}: {
  before: string;
  after: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-[90vw] max-h-[80vh] overflow-auto">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <div className="font-semibold">Preview save</div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ✕
          </Button>
        </header>
        <div className="p-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">Before</div>
            <pre className="text-xs font-mono bg-red-50 border border-red-200 rounded p-2 overflow-auto max-h-[50vh]">
              {before}
            </pre>
          </div>
          <div>
            <div className="text-xs uppercase text-neutral-500 mb-1">After</div>
            <pre className="text-xs font-mono bg-green-50 border border-green-200 rounded p-2 overflow-auto max-h-[50vh]">
              {after}
            </pre>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t px-4 py-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            Save
          </Button>
        </footer>
      </div>
    </div>
  );
}
