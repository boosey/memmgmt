"use client";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Entity, PseudoNode } from "@/core/entities";

export type HealthFilterKey =
  | "contested"
  | "stale"
  | "unknown"
  | "broken-import";

interface HealthFilterContextValue {
  active: HealthFilterKey | null;
  set: (key: HealthFilterKey | null) => void;
  clear: () => void;
  toggle: (key: HealthFilterKey) => void;
}

const HealthFilterContext = createContext<HealthFilterContextValue | null>(
  null,
);

export function HealthFilterProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<HealthFilterKey | null>(null);

  const set = useCallback(
    (key: HealthFilterKey | null) => setActive(key),
    [],
  );
  const clear = useCallback(() => setActive(null), []);
  const toggle = useCallback(
    (key: HealthFilterKey) =>
      setActive((curr) => (curr === key ? null : key)),
    [],
  );

  const value = useMemo<HealthFilterContextValue>(
    () => ({ active, set, clear, toggle }),
    [active, set, clear, toggle],
  );
  return createElement(HealthFilterContext.Provider, { value }, children);
}

export function useHealthFilter(): HealthFilterContextValue {
  const ctx = useContext(HealthFilterContext);
  if (!ctx) {
    throw new Error(
      "useHealthFilter must be used within a HealthFilterProvider",
    );
  }
  return ctx;
}

/** Given a filter and a group of entities + all pseudoNodes for the row, returns true if row is visible. */
export function groupMatchesFilter(
  group: readonly Entity[],
  active: HealthFilterKey | null,
  pseudoNodes: readonly PseudoNode[],
): boolean {
  if (!active) return true;
  switch (active) {
    case "contested":
      return group.length > 1;
    case "stale":
      return group.some((e) => e.stale);
    case "unknown":
      return group.some((e) => e.author === "unknown" || e.warn);
    case "broken-import": {
      if (group.some((e) => e.hasDeadImports)) return true;
      // Also check pseudo-nodes for broken `@path` — but these have no row.
      void pseudoNodes;
      return false;
    }
  }
}
