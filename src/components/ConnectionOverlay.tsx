"use client";
import type { Graph } from "@/core/types";

export function ConnectionOverlay({
  graph,
  enabled,
}: {
  graph: Graph;
  enabled: boolean;
}) {
  if (!enabled) return null;
  const imports = graph.edges.filter((e) => e.kind === "imports").length;
  const overrides = graph.edges.filter((e) => e.kind === "overrides").length;
  const dead = graph.edges.filter((e) => e.kind === "dead-import").length;
  return (
    <aside className="fixed bottom-4 right-4 bg-white border shadow-md rounded-md p-3 text-xs">
      <div className="font-medium mb-1">Connections</div>
      <div>imports: {imports}</div>
      <div>overrides: {overrides}</div>
      <div className="text-red-600">dead imports: {dead}</div>
    </aside>
  );
}
