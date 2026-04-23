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
import type { Relation } from "@/core/entities";

interface PinnedContextValue {
  pinnedId: string | null;
  pin: (id: string) => void;
  unpin: () => void;
  toggle: (id: string) => void;
}

const PinnedContext = createContext<PinnedContextValue | null>(null);

export function PinnedProvider({ children }: { children: ReactNode }) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const pin = useCallback((id: string) => setPinnedId(id), []);
  const unpin = useCallback(() => setPinnedId(null), []);
  const toggle = useCallback(
    (id: string) => setPinnedId((curr) => (curr === id ? null : id)),
    [],
  );

  const value = useMemo<PinnedContextValue>(
    () => ({ pinnedId, pin, unpin, toggle }),
    [pinnedId, pin, unpin, toggle],
  );

  return createElement(PinnedContext.Provider, { value }, children);
}

export function usePinned(): PinnedContextValue {
  const ctx = useContext(PinnedContext);
  if (!ctx) {
    throw new Error("usePinned must be used within a PinnedProvider");
  }
  return ctx;
}

export function isRelated(
  id: string,
  pinnedId: string | null,
  relations: readonly Relation[],
): boolean {
  if (!pinnedId || id === pinnedId) return false;
  for (const r of relations) {
    if (r.from === pinnedId && r.to === id) return true;
    if (r.to === pinnedId && r.from === id) return true;
  }
  return false;
}
