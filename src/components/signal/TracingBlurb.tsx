import type { EntityType } from "@/core/entities";
import { TYPE_LABELS } from "./typeLabels";

interface TracingBlurbProps {
  activeType: EntityType;
}

export function TracingBlurb({ activeType }: TracingBlurbProps) {
  return (
    <div className="px-7 pt-[14px]">
      <div className="max-w-[780px] text-[12.5px] leading-[1.55] text-[color:var(--text-muted)]">
        {TYPE_LABELS[activeType].blurb}
      </div>
    </div>
  );
}
