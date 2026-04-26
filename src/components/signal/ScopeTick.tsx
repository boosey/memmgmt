import type { Scope } from "@/core/entities";

const SCOPE_LABELS: Record<Scope, string> = {
  global: "Global",
  slug: "Slug",
  project: "Project",
  local: "Local",
};

interface ScopeTickProps {
  scope: Scope;
  active?: boolean;
}

export function ScopeTick({ scope, active = true }: ScopeTickProps) {
  return (
    <span
      className={[
        "smallcaps font-mono whitespace-nowrap rounded-sm px-[6px] py-[2px] text-[9.5px] tracking-[0.12em]",
        active
          ? "border border-[color:var(--rule)] text-[color:var(--ink)]"
          : "border border-[color:var(--rule-soft)] text-[color:var(--text-faint)]",
      ].join(" ")}
    >
      {SCOPE_LABELS[scope]}
    </span>
  );
}
