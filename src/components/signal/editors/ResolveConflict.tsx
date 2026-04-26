"use client";
import { useState } from "react";
import type { Entity } from "@/core/entities";
import { ecBtnClass } from "./shared";

interface ResolveConflictProps {
  group: readonly Entity[];
  winner: Entity;
  onResolved: () => void;
}

async function postBulk(action: string, entityIds: string[], confirm = true) {
  const r = await fetch("/api/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, entityIds, confirm }),
  });
  return r.json();
}

export function ResolveConflict({
  group,
  winner,
  onResolved,
}: ResolveConflictProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, ids: string[]) {
    setPending(action + ids.join(","));
    setError(null);
    try {
      const j = await postBulk(action, ids);
      if (!j.ok) {
        setError(String(j.reason ?? j.message ?? "failed"));
        return;
      }
      onResolved();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setPending(null);
    }
  }

  const ghost = ecBtnClass();
  const destructive = ecBtnClass(false, true);

  return (
    <div data-testid="resolve-conflict">
      <div className="mb-[12px] text-[13px] leading-[1.5] text-[color:var(--text-muted)]">
        Pick one winner. Other scopes can be <b>deleted</b>, <b>merged</b> into
        the winner, or <b>kept as overrides</b>.
      </div>
      {group.map((a) => {
        const isWinner = a.id === winner.id;
        return (
          <div
            key={a.id}
            data-testid="resolve-row"
            data-is-winner={isWinner ? "true" : "false"}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-[color:var(--rule-soft)] px-[12px] py-[10px]"
            style={
              isWinner
                ? {
                    background: "var(--paper)",
                    border: "1px solid var(--ink)",
                  }
                : {}
            }
          >
            <span
              className="smallcaps min-w-[60px] font-mono text-[10px] tracking-[0.14em] text-[color:var(--text-muted)]"
            >
              {a.scope}
            </span>
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-[color:var(--ink)]">
                {a.intent}
              </span>
              <div className="mt-0.5 truncate font-mono text-[10px] text-[color:var(--text-faint)]">
                {a.sourceFile}
              </div>
            </div>
            <div className="flex gap-[6px]">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this copy? This cannot be undone.")) {
                    run("delete-shadowed", [a.id]);
                  }
                }}
                disabled={pending !== null}
                className={destructive.className}
                style={destructive.style}
              >
                delete
              </button>
              {!isWinner && (
                <>
                  <button
                    type="button"
                    onClick={() => run("resolve-to-winner", [a.id])}
                    disabled={pending !== null}
                    className={ghost.className}
                    style={ghost.style}
                  >
                    make winner
                  </button>
                  <button
                    type="button"
                    onClick={() => run("merge-into-winner", [a.id])}
                    disabled={pending !== null}
                    className={ghost.className}
                    style={ghost.style}
                  >
                    merge
                  </button>
                  <button
                    type="button"
                    onClick={() => run("keep-as-override", [a.id])}
                    disabled={pending !== null}
                    className={ghost.className}
                    style={ghost.style}
                  >
                    keep override
                  </button>
                </>
              )}
              {isWinner && (
                <span
                  className="smallcaps ml-2 text-[10px] font-bold tracking-[0.14em] text-[color:var(--ink)]"
                >
                  current winner
                </span>
              )}
            </div>
          </div>
        );
      })}
      {error && (
        <div
          className="mt-3 text-[11.5px]"
          style={{ color: "var(--semantic-error)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
