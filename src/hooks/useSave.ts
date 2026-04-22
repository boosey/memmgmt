"use client";
import { useState } from "react";

export interface SaveArgs {
  sourceFile: string;
  scopeRoot: string;
  nextContent: string;
  expectedMtimeMs: number;
}

export interface SaveSuccess {
  ok: true;
  backupPath: string;
  newMtimeMs: number;
}

export interface SaveFailure {
  ok: false;
  reason: string;
}

export function useSave() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(args: SaveArgs): Promise<SaveSuccess | SaveFailure> {
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      const j = await r.json();
      if (!r.ok) {
        const reason = String(j.reason ?? j.error ?? "error");
        setError(reason);
        return { ok: false, reason };
      }
      return j as SaveSuccess;
    } finally {
      setPending(false);
    }
  }

  async function undo(args: { sourceFile: string; scopeRoot: string }) {
    const r = await fetch("/api/undo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    return (await r.json()) as { ok: boolean; reason?: string };
  }

  return { save, undo, pending, error };
}
