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

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 2) + "…";
}

export function Composite({ winner, shadowedCount }: CompositeProps) {
  const contested = shadowedCount > 0;
  return (
    <div
      className="rounded-sm bg-[color:var(--paper)] px-[10px] py-[8px]"
      style={{
        border: "1.5px solid var(--ink)",
        borderLeft: `3px solid ${AUTHOR_STRIPE[winner.author]}`,
      }}
    >
      <div className="text-[13px] leading-[1.35] font-medium text-[color:var(--ink)]">
        {truncate(winner.intent, 56)}
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
