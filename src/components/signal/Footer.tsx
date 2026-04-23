import type { Detection } from "@/core/entities";
import { DetectionsAccordion } from "./DetectionsAccordion";
import { ProvenanceLegend } from "./ProvenanceLegend";

interface FooterProps {
  detections: readonly Detection[];
}

export function Footer({ detections }: FooterProps) {
  return (
    <footer className="flex flex-col gap-3 border-t border-[color:var(--rule)] bg-[color:var(--paper-deep)] px-7 py-[10px]">
      <DetectionsAccordion detections={detections} />
      <div className="flex items-center justify-between">
        <ProvenanceLegend />
        <div
          className="font-mono text-[10px] text-[color:var(--text-muted)]"
          style={{ letterSpacing: "0.1em" }}
        >
          override · provides · invokes · gates · imports · fires-on ·
          accretes-from
        </div>
      </div>
    </footer>
  );
}
