import type { AuthorBucket, Entity, Scope } from "@/core/entities";
import { WireSegment } from "./WireSegment";

interface SignalNodeProps {
  entity: Entity;
  isWinner: boolean;
  isShadowed: boolean;
}

const AUTHOR_STRIPE: Record<AuthorBucket, string> = {
  anthropic: "var(--author-anthropic)",
  community: "var(--author-community)",
  you: "var(--author-you)",
  unknown: "var(--author-unknown)",
};

const AUTHOR_TINT: Record<AuthorBucket, string> = {
  anthropic: "var(--author-anthropic-tint)",
  community: "var(--author-community-tint)",
  you: "var(--author-you-tint)",
  unknown: "var(--author-unknown-tint)",
};

const SCOPE_SHORT: Record<Scope, string> = {
  global: "Global",
  plugin: "Plugin",
  slug: "Slug",
  project: "Project",
  local: "Local",
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 2) + "…";
}

export function SignalNode({ entity, isWinner, isShadowed }: SignalNodeProps) {
  const stripe = AUTHOR_STRIPE[entity.author];
  const tint = AUTHOR_TINT[entity.author];

  return (
    <div
      title={entity.intent}
      className={[
        "relative w-full overflow-hidden rounded-sm px-[7px] py-[4px] leading-[1.25] whitespace-nowrap",
        isWinner
          ? "border border-[color:var(--ink)] bg-[color:var(--paper)] shadow-[1px_1px_0_var(--ink)]"
          : "border border-[color:var(--rule)]",
        isShadowed ? "opacity-60" : "",
      ].join(" ")}
      style={{
        borderLeft: `3px solid ${stripe}`,
        ...(isWinner ? {} : { background: tint }),
      }}
    >
      <div className="smallcaps font-mono text-[9px] tracking-[0.12em] text-[color:var(--text-muted)]">
        {SCOPE_SHORT[entity.scope]}
      </div>
      <div
        className={[
          "overflow-hidden text-[11.5px] text-[color:var(--ink)]",
          isShadowed ? "line-through decoration-[color:var(--text-faint)]" : "",
        ].join(" ")}
        style={{ textOverflow: "ellipsis" }}
      >
        {truncate(entity.intent, 26)}
      </div>
      <WireSegment />
    </div>
  );
}
