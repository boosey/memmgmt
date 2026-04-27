import type { EntityType } from "@/core/entities";
import { TYPE_LABELS } from "./typeLabels";

export type GroupBy = "identity" | "file";

interface TracingBlurbProps {
  activeType: EntityType;
  groupBy: GroupBy;
  onGroupByChange: (val: GroupBy) => void;
}

export function TracingBlurb({
  activeType,
  groupBy,
  onGroupByChange,
}: TracingBlurbProps) {
  return (
    <div className="flex items-center justify-between px-7 pt-[14px]">
      <div className="max-w-[780px] text-[12.5px] leading-[1.55] text-[color:var(--text-muted)]">
        {TYPE_LABELS[activeType].blurb}
      </div>
      <div className="flex items-center gap-3">
        <span className="smallcaps text-[10px] tracking-[0.1em] text-[color:var(--text-faint)]">
          Group by
        </span>
        <div className="flex gap-1 rounded-sm border border-[color:var(--rule)] p-[2px] bg-[color:var(--paper-deep)]">
          {(["identity", "file"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGroupByChange(g)}
              className={[
                "cursor-pointer rounded-[1px] px-2 py-[2px] text-[10.5px] font-medium transition-colors",
                groupBy === g
                  ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--rule-soft)]",
              ].join(" ")}
            >
              {g === "identity" ? "Identity" : "File"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
