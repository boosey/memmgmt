const GRID_COLS =
  "grid-cols-[22px_300px_repeat(4,120px)_1fr_minmax(0,1.4fr)]";

const SCOPE_LABELS = ["Global", "Slug", "Project", "Local"];

export function SchematicHeader() {
  return (
    <div
      className={[
        "grid gap-[10px] border-b border-[color:var(--rule)] pb-2",
        GRID_COLS,
      ].join(" ")}
    >
      <div aria-hidden="true" />
      <div className="smallcaps text-[10px] tracking-[0.2em] text-[color:var(--text-muted)]">
        Entity
      </div>
      {SCOPE_LABELS.map((label) => (
        <div
          key={label}
          className="smallcaps pb-1 text-center text-[10px] tracking-[0.2em] text-[color:var(--text-muted)]"
        >
          {label}
        </div>
      ))}
      <div className="smallcaps border-b-2 border-[color:var(--ink)] pb-1 text-[10px] tracking-[0.2em] text-[color:var(--ink)]">
        Composite
      </div>
      <div className="smallcaps pb-1 text-[10px] tracking-[0.2em] text-[color:var(--ink)]">
        Relations
      </div>
    </div>
  );
}

export const SIGNAL_ROW_GRID_COLS = GRID_COLS;
