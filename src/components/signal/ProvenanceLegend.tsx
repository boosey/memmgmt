import type { AuthorBucket } from "@/core/entities";

interface Swatch {
  key: AuthorBucket;
  label: string;
  colorVar: string;
}

const SWATCHES: readonly Swatch[] = [
  { key: "anthropic", label: "Anthropic", colorVar: "var(--author-anthropic)" },
  { key: "community", label: "Community", colorVar: "var(--author-community)" },
  { key: "you", label: "You", colorVar: "var(--author-you)" },
  { key: "unknown", label: "Unknown", colorVar: "var(--author-unknown)" },
];

export function ProvenanceLegend() {
  return (
    <div className="flex items-center gap-4">
      {SWATCHES.map((s) => (
        <div key={s.key} className="flex items-center gap-[6px]">
          <span
            aria-hidden="true"
            className="inline-block size-[10px] rounded-full"
            style={{ background: s.colorVar }}
          />
          <span className="text-[11px] text-[color:var(--ink)]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
