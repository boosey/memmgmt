import type { AuthorBucket } from "@/core/entities";

interface AuthorBadgeProps {
  author: AuthorBucket;
}

const LABEL: Record<AuthorBucket, string> = {
  anthropic: "Anthropic",
  community: "Community",
  you: "You",
  unknown: "Unknown",
};

const COLOR: Record<AuthorBucket, string> = {
  anthropic: "var(--author-anthropic)",
  community: "var(--author-community)",
  you: "var(--author-you)",
  unknown: "var(--author-unknown)",
};

const INK: Record<AuthorBucket, string> = {
  anthropic: "var(--author-anthropic-ink)",
  community: "var(--author-community-ink)",
  you: "var(--author-you-ink)",
  unknown: "var(--author-unknown-ink)",
};

export function AuthorBadge({ author }: AuthorBadgeProps) {
  return (
    <span
      className="smallcaps inline-flex items-center gap-[6px] text-[9.5px]"
      style={{ color: INK[author] }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-[7px] rounded-full"
        style={{ background: COLOR[author] }}
      />
      {LABEL[author]}
    </span>
  );
}
