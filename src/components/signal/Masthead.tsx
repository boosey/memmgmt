export function Masthead() {
  return (
    <div
      data-testid="masthead"
      className="flex items-baseline justify-between gap-6 border-b border-[color:var(--rule)] bg-[color:var(--paper)] px-7 pt-6 pb-4"
    >
      <div className="flex items-baseline gap-4">
        <span
          className="font-sans text-[26px] font-semibold leading-none text-[color:var(--ink)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          The Memory Register
        </span>
        <span className="smallcaps text-[10px] text-[color:var(--text-muted)]">
          Trace entities, follow relationships, resolve and prune — all inline.
        </span>
      </div>
      <span className="smallcaps font-mono text-[10px] text-[color:var(--text-muted)]">
        Signal Edition · v1.6
      </span>
    </div>
  );
}
