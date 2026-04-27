"use client";
import {
  SCOPE_ORDER,
  type Entity,
  type PseudoNode,
  type Relation,
  type Scope,
} from "@/core/entities";
import { Composite } from "./Composite";
import { EmptyLane } from "./EmptyLane";
import { RelationPill } from "./RelationPill";
import { SignalNode } from "./SignalNode";
import { SIGNAL_ROW_GRID_COLS } from "./SchematicHeader";

interface SignalRowProps {
  group: readonly Entity[];
  winner: Entity;
  groupKey: string;
  identityGroup?: readonly Entity[];
  relationsOut: readonly Relation[];
  relationsIn: readonly Relation[];
  targetsById: ReadonlyMap<string, Entity | PseudoNode>;
  isPinned: boolean;
  isRelated: boolean;
  isChecked: boolean;
  isExpanded: boolean;
  onPin: (id: string) => void;
  onPinTarget: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpenEditor: (groupKey: string) => void;
  onResolveImport?: (
    relation: Relation,
    importer: Entity,
    target: PseudoNode | undefined,
  ) => void;
}

export function SignalRow({
  group,
  winner,
  groupKey,
  identityGroup,
  relationsOut,
  relationsIn,
  targetsById,
  isPinned,
  isRelated,
  isChecked,
  isExpanded,
  onPin,
  onPinTarget,
  onToggleSelect,
  onOpenEditor,
  onResolveImport,
}: SignalRowProps) {
  const byScope = new Map<Scope, Entity[]>();
  for (const a of group) {
    const arr = byScope.get(a.scope) ?? [];
    arr.push(a);
    byScope.set(a.scope, arr);
  }

  // Use the provided identityGroup (all scope copies) or fallback to the current group
  const effectiveGroup = identityGroup ?? group;
  const contested = effectiveGroup.length > 1;

  // In Identity mode (group.length > 1), shadowed count is group - 1.
  // In File mode (group.length === 1), if the single entity is not the winner, it is shadowed.
  const isShadowedInFileMode =
    identityGroup && identityGroup.length > 1 && group.length === 1 && !group.some(e => e.id === winner.id);
  const shadowedCount = group.length > 1 ? group.length - 1 : isShadowedInFileMode ? 1 : 0;

  const relCount = relationsOut.length + relationsIn.length;

  const rowBg = isExpanded
    ? "bg-[color:var(--paper-deep)]"
    : isPinned
      ? "bg-[oklch(0.97_0.03_55)]"
      : isRelated
        ? "bg-[oklch(0.98_0.015_55)]"
        : "bg-transparent";

  const rowRing = isExpanded
    ? "shadow-[inset_0_0_0_1px_var(--ink)]"
    : isPinned
      ? "shadow-[inset_0_0_0_1px_var(--ink)]"
      : isRelated
        ? "shadow-[inset_0_0_0_1px_var(--rule)]"
        : "";

  return (
    <div
      data-row-id={winner.id}
      data-group-key={groupKey}
      data-expanded={isExpanded ? "true" : "false"}
      onClick={() => onPin(winner.id)}
      className={[
        "grid cursor-pointer items-center gap-[10px] border-t border-[color:var(--rule-soft)] px-[6px] py-3 transition-colors",
        SIGNAL_ROW_GRID_COLS,
        rowBg,
        rowRing,
      ].join(" ")}
    >
      {/* checkbox */}
      <div
        data-testid="row-checkbox"
        role="checkbox"
        aria-checked={isChecked}
        className="flex cursor-pointer justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(winner.id);
        }}
      >
        <span
          aria-hidden="true"
          className={[
            "flex size-[14px] items-center justify-center rounded-sm text-[10px] leading-none",
            isChecked
              ? "border border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
              : "border border-[color:var(--rule)] bg-transparent",
          ].join(" ")}
        >
          {isChecked ? "✓" : ""}
        </span>
      </div>

      {/* identity */}
      <div className="flex items-center gap-[10px] min-w-0">
        <button
          type="button"
          title={isExpanded ? "Close editor" : "Open editor"}
          aria-expanded={isExpanded}
          data-testid="row-chevron"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEditor(groupKey);
          }}
          className={[
            "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border text-[14px] font-semibold leading-none",
            isExpanded
              ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
              : "border-[color:var(--rule)] bg-[color:var(--paper)] text-[color:var(--ink)]",
          ].join(" ")}
        >
          <span aria-hidden="true">{isExpanded ? "⌄" : "›"}</span>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-[6px]">
            <div className="truncate text-[15.5px] leading-[1.15] font-semibold text-[color:var(--ink)]">
              {winner.title}
            </div>
            {group.some((e) => e.parseError) && (
              <span
                data-testid="row-badge-parse-error"
                title={group.find((e) => e.parseError)?.parseError}
                className="smallcaps shrink-0 rounded-sm px-[5px] py-[1px] text-[8.5px] tracking-[0.12em]"
                style={{
                  background: "var(--semantic-error)",
                  color: "var(--paper)",
                }}
              >
                parse error
              </span>
            )}
            {winner.enabled === false && (
              <span
                data-testid="row-badge-disabled"
                className="smallcaps shrink-0 rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper-deep)] px-[5px] py-[1px] text-[8.5px] tracking-[0.12em] text-[color:var(--text-muted)]"
              >
                {winner.disabledReason === "plugin" ? "plugin disabled" : "disabled"}
              </span>
            )}
            {group.some((e) => e.hasDeadImports) && (
              <span
                data-testid="row-badge-dead-imports"
                className="smallcaps shrink-0 rounded-sm border px-[5px] py-[1px] text-[8.5px] tracking-[0.12em]"
                style={{
                  borderColor: "var(--semantic-error)",
                  color: "var(--semantic-error)",
                }}
              >
                dead imports
              </span>
            )}
          </div>
          <div className="smallcaps mt-[2px] font-mono text-[10px] tracking-[0.12em] text-[color:var(--text-muted)]">
            {contested ? `${group.length} scopes` : "single source"}
            {relationsOut.length > 0 ? ` · ${relationsOut.length} out` : ""}
            {relationsIn.length > 0 ? ` · ${relationsIn.length} in` : ""}
          </div>
        </div>
      </div>

      {/* 4 scope cells */}
      {SCOPE_ORDER.map((scope) => {
        const nodes = byScope.get(scope);
        const hasWinner = nodes?.some((n) => n.id === winner.id);
        const isShadowed = !!nodes && !hasWinner;
        return (
          <div
            key={scope}
            className="relative flex h-[52px] min-w-0 items-center justify-center"
          >
            {nodes ? (
              <SignalNode
                entities={nodes}
                isWinner={!!hasWinner}
                isShadowed={isShadowed}
              />
            ) : (
              <EmptyLane />
            )}
          </div>
        );
      })}

      {/* composite */}
      <Composite winner={winner} shadowedCount={shadowedCount} />

      {/* relations */}
      <div
        className="flex flex-col gap-[3px] min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {relationsOut.map((r) => (
          <RelationPill
            key={`o-${r.id}`}
            relation={r}
            direction="out"
            target={targetsById.get(r.to)}
            onPinTarget={onPinTarget}
            onResolve={(rel, target) => onResolveImport?.(rel, winner, target)}
          />
        ))}
        {relationsIn.map((r) => (
          <RelationPill
            key={`i-${r.id}`}
            relation={r}
            direction="in"
            target={targetsById.get(r.from)}
            onPinTarget={onPinTarget}
            onResolve={(rel, target) => onResolveImport?.(rel, winner, target)}
          />
        ))}
        {relCount === 0 && (
          <span className="text-[12px] text-[color:var(--text-faint)]">—</span>
        )}
      </div>
    </div>
  );
}
