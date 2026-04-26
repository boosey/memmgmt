"use client";
import type {
  Entity,
  PseudoNode,
  Relation,
  RelationKind,
} from "@/core/entities";
import { TYPE_LABELS } from "./typeLabels";

interface RelationPillProps {
  relation: Relation;
  direction: "out" | "in";
  target: Entity | PseudoNode | undefined;
  onPinTarget: (id: string) => void;
  onResolve?: (relation: Relation, target: PseudoNode | undefined) => void;
}

interface KindLabels {
  out: string;
  in: string;
}

const KIND_LABELS: Record<RelationKind, KindLabels> = {
  provides: { out: "provides", in: "provided by" },
  invokes: { out: "invokes", in: "invoked by" },
  gates: { out: "gates", in: "gated by" },
  imports: { out: "imports", in: "imported by" },
  "fires-on": { out: "fires on", in: "triggers" },
  "accretes-from": { out: "accretes from", in: "feeds" },
};

function describeTarget(
  target: Entity | PseudoNode | undefined,
  fallbackId: string,
): { label: string; typeLabel: string; clickable: boolean } {
  if (!target) {
    return { label: fallbackId, typeLabel: "—", clickable: false };
  }
  if ("type" in target) {
    return {
      label: target.title,
      typeLabel: TYPE_LABELS[target.type].label,
      clickable: true,
    };
  }
  switch (target.kind) {
    case "tool":
      return { label: target.matcher, typeLabel: "Tool", clickable: true };
    case "slug":
      return { label: target.name, typeLabel: "Slug", clickable: true };
    case "path":
      return { label: target.path, typeLabel: "File", clickable: true };
  }
}

export function RelationPill({
  relation,
  direction,
  target,
  onPinTarget,
  onResolve,
}: RelationPillProps) {
  const targetId = direction === "out" ? relation.to : relation.from;
  const verb = KIND_LABELS[relation.kind][direction];
  const { label, typeLabel, clickable } = describeTarget(target, targetId);
  const broken = relation.broken === true;

  const stripe = broken
    ? "var(--semantic-error)"
    : direction === "out"
      ? "var(--ink)"
      : "var(--text-muted)";

  const border = broken
    ? "1px solid var(--semantic-error)"
    : "1px solid var(--rule-soft)";

  return (
    <button
      type="button"
      data-testid="relation-pill"
      data-direction={direction}
      data-kind={relation.kind}
      data-broken={broken ? "true" : "false"}
      data-target-id={targetId}
      onClick={(e) => {
        e.stopPropagation();
        if (broken && onResolve) {
          onResolve(relation, target as PseudoNode | undefined);
        } else if (clickable) {
          onPinTarget(targetId);
        }
      }}
      className={[
        "flex w-full items-center gap-[6px] rounded-sm px-[6px] py-[3px] text-left",
        clickable ? "cursor-pointer" : "cursor-default",
        broken ? "bg-[oklch(0.97_0.03_28)]" : "bg-transparent",
      ].join(" ")}
      style={{ border, borderLeft: `2px solid ${stripe}` }}
    >
      <span
        className="smallcaps font-mono min-w-[62px] text-[8.5px] tracking-[0.14em] text-[color:var(--text-muted)]"
      >
        {verb}
      </span>
      <span
        className={[
          "flex-1 overflow-hidden text-[11.5px] whitespace-nowrap",
          clickable
            ? "border-b border-dotted border-[color:var(--text-muted)] font-medium text-[color:var(--ink)]"
            : "font-normal text-[color:var(--text-muted)]",
        ].join(" ")}
        style={{ textOverflow: "ellipsis" }}
      >
        {label}
      </span>
      <span className="font-mono text-[12px] tracking-[0.08em] text-[color:var(--text-faint)]">
        {typeLabel}
      </span>
      {broken && (
        <span
          className="smallcaps rounded-sm px-[5px] py-[1px] text-[8.5px] tracking-[0.12em]"
          style={{
            background: "var(--semantic-error)",
            color: "var(--paper)",
          }}
        >
          missing
        </span>
      )}
    </button>
  );
}
