"use client";
import type { Entity, PseudoNode } from "@/core/entities";
import { TYPE_LABELS } from "./typeLabels";

interface TracingBannerProps {
  pinned: Entity | PseudoNode;
  relatedCount: number;
  kindCount: number;
  onClear: () => void;
}

function describePinned(pinned: Entity | PseudoNode): {
  title: string;
  kindLabel: string;
} {
  if ("type" in pinned) {
    return {
      title: pinned.title,
      kindLabel: TYPE_LABELS[pinned.type].label,
    };
  }
  switch (pinned.kind) {
    case "slug":
      return { title: pinned.name, kindLabel: "Slug" };
    case "tool":
      return { title: pinned.matcher, kindLabel: "Tool" };
    case "path":
      return { title: pinned.path, kindLabel: "File" };
  }
}

export function TracingBanner({
  pinned,
  relatedCount,
  kindCount,
  onClear,
}: TracingBannerProps) {
  const { title, kindLabel } = describePinned(pinned);
  return (
    <div
      data-testid="tracing-banner"
      className="flex items-center gap-[14px] border-b border-[color:var(--rule)] px-7 py-[10px]"
      style={{ background: "oklch(0.97 0.03 55)" }}
    >
      <span className="smallcaps text-[10px] tracking-[0.2em] text-[color:var(--text-muted)]">
        Tracing
      </span>
      <span
        data-testid="tracing-banner-title"
        className="text-[16px] font-semibold text-[color:var(--ink)]"
      >
        {title}
      </span>
      <span
        data-testid="tracing-banner-kind"
        className="smallcaps font-mono text-[9.5px] tracking-[0.14em] text-[color:var(--text-muted)]"
      >
        {kindLabel}
      </span>
      <span className="flex-1" />
      <span
        data-testid="tracing-banner-counts"
        data-related-count={relatedCount}
        data-kind-count={kindCount}
        className="text-[12px] text-[color:var(--text-muted)]"
      >
        {relatedCount} related across {kindCount} kind{kindCount === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        data-testid="tracing-banner-clear"
        onClick={onClear}
        className="cursor-pointer rounded-sm border border-[color:var(--ink)] bg-transparent px-[11px] py-[5px] text-[11.5px] font-medium text-[color:var(--ink)]"
      >
        clear
      </button>
    </div>
  );
}
