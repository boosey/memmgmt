"use client";
import { useState } from "react";
import type { Entity, Scope } from "@/core/entities";
import {
  SCOPE_LADDER,
  scopeAbove,
  scopeBelow,
  type BulkAction,
  type BulkRequest,
  type BulkResponse,
} from "@/core/apiContracts";
import { Chip, FormRow, ecBtnClass } from "./shared";

interface ScopeMoverProps {
  entity: Entity;
  onMoved: () => void;
}

/**
 * Scope moves flow through /api/bulk (promote-scope / demote-scope) so the
 * backend can re-root the source path, rewrite relations, and leave a backup
 * in one transaction. This UI only exposes direct neighbors — the multi-step
 * ladder traversal isn't a v1.7 surface.
 */
export function ScopeMover({ entity, onMoved }: ScopeMoverProps) {
  const [scope, setScope] = useState<Scope>(entity.scope);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const above = scopeAbove(entity.scope);
  const below = scopeBelow(entity.scope);

  function scopeToAction(target: Scope): BulkAction | null {
    if (target === above) return "promote-scope";
    if (target === below) return "demote-scope";
    return null;
  }

  const action = scope === entity.scope ? null : scopeToAction(scope);
  const disabled = action === null || pending;
  const saveBtn = ecBtnClass(true);

  async function save() {
    if (!action) return;
    setPending(true);
    setError(null);
    try {
      const body: BulkRequest = {
        action,
        entityIds: [entity.id],
        confirm: true,
      };
      const resp = await fetch("/api/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await resp.json()) as BulkResponse;
      if (!j.ok) {
        setError(String(j.reason ?? j.message ?? "move failed"));
        return;
      }
      onMoved();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div data-testid="scope-mover">
      <FormRow
        label="Move to scope"
        hint="Promote (one step up) or demote (one step down). Writes a backup + rewrites relations."
      >
        <div className="flex flex-wrap gap-[6px]">
          {SCOPE_LADDER.map((sk) => {
            const reachable =
              sk === entity.scope || sk === above || sk === below;
            const title = reachable
              ? null
              : "Only neighbor scopes are reachable from this entity.";
            return (
              <Chip
                key={sk}
                label={sk.toUpperCase()}
                active={scope === sk}
                onClick={() => {
                  if (reachable) setScope(sk);
                }}
                {...(title ? { title } : {})}
              />
            );
          })}
        </div>
        <div className="mt-[10px] text-[12px] text-[color:var(--text-muted)]">
          Current: <b className="text-[color:var(--ink)]">{entity.scope}</b>
          {scope !== entity.scope && (
            <>
              {" "}
              → New: <b className="text-[color:var(--ink)]">{scope}</b>{" "}
              <span className="smallcaps font-mono text-[9.5px] tracking-[0.14em] text-[color:var(--text-faint)]">
                · {action}
              </span>
            </>
          )}
        </div>
      </FormRow>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          data-testid="scope-mover-save"
          disabled={disabled}
          onClick={save}
          className={saveBtn.className}
          style={{
            ...saveBtn.style,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "moving…" : "Move scope"}
        </button>
        {error && (
          <span
            className="text-[11.5px]"
            style={{ color: "var(--semantic-error)" }}
          >
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
