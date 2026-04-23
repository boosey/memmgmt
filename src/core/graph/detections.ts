import type {
  Detection,
  DetectionOccurrence,
} from "../entities";
import { DETECTION_CONVENTIONS } from "../entities";

// Accumulator used by parsers and the graph builder to report conventions
// recognized on disk but not yet modeled as first-class entities or relations.
// Flushed to Detection[] at build-end for inclusion in the GraphPayload.

type ConventionKey =
  (typeof DETECTION_CONVENTIONS)[keyof typeof DETECTION_CONVENTIONS]["key"];

const LABELS: Record<ConventionKey, string> = Object.fromEntries(
  Object.values(DETECTION_CONVENTIONS).map((c) => [c.key, c.label]),
) as Record<ConventionKey, string>;

export class DetectionEmitter {
  private buckets = new Map<ConventionKey, DetectionOccurrence[]>();

  emit(
    convention: ConventionKey,
    sourceFile: string,
    excerpt?: string,
  ): void {
    const arr = this.buckets.get(convention) ?? [];
    arr.push(excerpt !== undefined ? { sourceFile, excerpt } : { sourceFile });
    this.buckets.set(convention, arr);
  }

  flush(): Detection[] {
    const out: Detection[] = [];
    for (const [convention, occurrences] of this.buckets) {
      out.push({
        convention,
        label: LABELS[convention],
        occurrences,
      });
    }
    // Stable order: by count desc, then convention key asc (for test determinism).
    out.sort((a, b) => {
      const d = b.occurrences.length - a.occurrences.length;
      return d !== 0 ? d : a.convention.localeCompare(b.convention);
    });
    return out;
  }

  /** Read-only probe for tests. */
  count(convention: ConventionKey): number {
    return this.buckets.get(convention)?.length ?? 0;
  }
}
