"use client";
import { useMemo, useState } from "react";
import type { Entity } from "@/core/entities";
import {
  applicableBulkActions,
  type BulkAction,
  type BulkRequest,
  type BulkResponse,
} from "@/core/apiContracts";
import { useSelection } from "@/hooks/useSelection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ecBtnClass } from "./editors/shared";

const DESTRUCTIVE: ReadonlySet<BulkAction> = new Set([
  "delete-shadowed",
  "delete-entity",
]);

const ACTION_LABELS: Record<BulkAction, string> = {
  "resolve-to-winner": "Resolve to winner",
  "delete-shadowed": "Delete shadowed",
  "promote-scope": "Promote scope",
  "demote-scope": "Demote scope",
  "dismiss-stale": "Dismiss stale",
  "flag-for-review": "Flag for review",
  "delete-entity": "Delete entity",
};

interface BulkActionBarProps {
  entities: readonly Entity[];
  onApplied: () => void;
}

function buildApplicability(
  selectedEntities: Entity[],
  allEntities: readonly Entity[],
) {
  let hasContested = false;
  let hasStale = false;
  let hasUnknownAuthor = false;
  let contestedCount = 0;
  let staleCount = 0;
  let flaggedCount = 0;

  // An entity is contested if its identity appears on >1 entity across the
  // FULL graph — not just the selection. Selecting a single copy of a
  // contested pair should still enable resolve-to-winner / delete-shadowed;
  // the backend expands from identity.
  const identityCount = new Map<string, number>();
  for (const e of allEntities) {
    if (!e.identity) continue;
    identityCount.set(e.identity, (identityCount.get(e.identity) ?? 0) + 1);
  }
  for (const e of selectedEntities) {
    if (e.identity && (identityCount.get(e.identity) ?? 0) > 1) {
      hasContested = true;
      contestedCount += 1;
    }
    if (e.stale) {
      hasStale = true;
      staleCount += 1;
    }
    if (e.author === "unknown" || e.warn) {
      hasUnknownAuthor = true;
      flaggedCount += 1;
    }
  }

  return {
    hasContested,
    hasStale,
    hasUnknownAuthor,
    count: selectedEntities.length,
    contestedCount,
    staleCount,
    flaggedCount,
  };
}

export function BulkActionBar({ entities, onApplied }: BulkActionBarProps) {
  const selection = useSelection();
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const selectedEntities = useMemo(() => {
    return entities.filter((e) => selection.isSelected(e.id));
  }, [entities, selection]);

  const app = useMemo(
    () => buildApplicability(selectedEntities, entities),
    [selectedEntities, entities],
  );

  const actions = useMemo(
    () =>
      applicableBulkActions({
        hasContested: app.hasContested,
        hasStale: app.hasStale,
        hasUnknownAuthor: app.hasUnknownAuthor,
        count: app.count,
      }),
    [app],
  );

  if (selection.selected.size === 0) return null;

  async function runAction(action: BulkAction, confirm = false) {
    setPending(action);
    setError(null);
    try {
      const body: BulkRequest = {
        action,
        entityIds: Array.from(selection.selected),
        confirm,
      };
      const r = await fetch("/api/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as BulkResponse;
      if (!j.ok) {
        setError(String(j.reason ?? j.message ?? "bulk failed"));
        return;
      }
      selection.clear();
      onApplied();
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setPending(null);
      setConfirmAction(null);
    }
  }

  function onActionClick(action: BulkAction) {
    if (action === "delete-entity") {
      setConfirmAction(action);
      return;
    }
    void runAction(action);
  }

  const summary = [
    app.contestedCount > 0 ? `${app.contestedCount} contested` : null,
    app.staleCount > 0 ? `${app.staleCount} stale` : null,
    app.flaggedCount > 0 ? `${app.flaggedCount} flagged` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div
        data-testid="bulk-action-bar"
        className="fixed right-0 bottom-0 left-0 z-40 flex items-center gap-4 rounded-t-[4px] px-6 py-3 shadow-lg"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      >
        <div className="flex flex-col gap-[2px]">
          <span className="smallcaps text-[9.5px] tracking-[0.2em] opacity-70">
            Selected
          </span>
          <span className="text-[13px] font-medium">
            {selection.selected.size}{" "}
            {selection.selected.size === 1 ? "entity" : "entities"}
            {summary && (
              <>
                {" "}
                · <span className="opacity-80">{summary}</span>
              </>
            )}
          </span>
        </div>
        <span className="flex-1" />
        <div className="flex flex-wrap items-center gap-[6px]">
          {actions.map((a) => {
            const destructive = DESTRUCTIVE.has(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => onActionClick(a)}
                disabled={pending !== null}
                data-testid={`bulk-action-${a}`}
                className={[
                  "cursor-pointer rounded-sm border px-[11px] py-[5px] text-[11.5px] font-medium",
                  destructive
                    ? "border-[color:var(--semantic-error)] text-[color:var(--paper)]"
                    : "border-[color:var(--paper)] text-[color:var(--paper)]",
                ].join(" ")}
                style={{
                  background: destructive
                    ? "var(--semantic-error)"
                    : "transparent",
                }}
              >
                {pending === a ? "…" : ACTION_LABELS[a]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => selection.clear()}
          data-testid="bulk-action-clear"
          className="cursor-pointer border-none bg-transparent text-[11px] underline"
          style={{ color: "var(--paper)", opacity: 0.8 }}
        >
          Clear
        </button>
      </div>
      {error && (
        <div
          className="fixed right-6 bottom-16 z-50 rounded-sm px-3 py-2 text-[11.5px]"
          style={{
            background: "var(--semantic-error)",
            color: "var(--paper)",
          }}
        >
          {error}
        </div>
      )}

      <Dialog
        open={confirmAction === "delete-entity"}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selection.selected.size} entit{selection.selected.size === 1 ? "y" : "ies"}?</DialogTitle>
            <DialogDescription>
              All scope copies of the selected entities will be deleted. Each
              file will be backed up first. This cannot be undone through the
              UI, but backups remain on disk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              disabled={pending !== null}
              className={ecBtnClass().className}
              style={ecBtnClass().style}
            >
              cancel
            </button>
            <button
              type="button"
              onClick={() => runAction("delete-entity", true)}
              disabled={pending !== null}
              className={ecBtnClass(true, true).className}
              style={ecBtnClass(true, true).style}
            >
              {pending === "delete-entity" ? "deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
