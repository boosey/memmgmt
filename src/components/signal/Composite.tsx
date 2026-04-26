import type { AuthorBucket, Entity } from "@/core/entities";
import { AuthorBadge } from "./AuthorBadge";

interface CompositeProps {
  winner: Entity;
  shadowedCount: number;
}

const AUTHOR_STRIPE: Record<AuthorBucket, string> = {
  anthropic: "var(--author-anthropic)",
  community: "var(--author-community)",
  you: "var(--author-you)",
  unknown: "var(--author-unknown)",
};

export function Composite({ winner, shadowedCount }: CompositeProps) {
  const contested = shadowedCount > 0;
  return (
    <div
      className="min-w-0 rounded-sm bg-[color:var(--paper)] px-[10px] py-[8px]"
      style={{
        border: "1.5px solid var(--ink)",
        borderLeft: `3px solid ${AUTHOR_STRIPE[winner.author]}`,
      }}
    >
      <div
        className="truncate text-[13px] font-medium leading-[1.35] text-[color:var(--ink)]"
        title={winner.intent}
      >
        {winner.intent}
      </div>
      <div className="mt-[3px] flex items-center gap-2">
        <AuthorBadge author={winner.author} />
        <span className="smallcaps font-mono text-[9px] tracking-[0.14em] text-[color:var(--text-muted)]">
          from {winner.scope}
        </span>
        {contested && (
          <span className="font-mono text-[10px] text-[color:var(--text-muted)]">
            · {shadowedCount} shadowed
          </span>
        )}
      </div>
    </div>
  );
}
