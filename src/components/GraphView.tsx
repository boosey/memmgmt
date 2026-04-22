"use client";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Graph, Scope } from "@/core/types";

const SCOPE_COLOR: Record<Scope, string> = {
  global: "#475569",
  slug: "#7c3aed",
  plugin: "#ea580c",
  project: "#16a34a",
  local: "#dc2626",
};

const EDGE_COLOR: Record<string, string> = {
  imports: "#2563eb",
  overrides: "#f59e0b",
  "plugin-provides": "#6b7280",
  "dead-import": "#dc2626",
  contains: "#e5e7eb",
};

export function GraphView({
  graph,
  onSelect,
}: {
  graph: Graph;
  onSelect: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => toReactFlow(graph), [graph]);
  return (
    <div className="h-[calc(100vh-49px)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, n) => onSelect(n.id)}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function toReactFlow(g: Graph): { nodes: Node[]; edges: Edge[] } {
  const nodeIds = new Set(g.nodes.map((n) => n.id));
  const nodes: Node[] = g.nodes.map((n, i) => ({
    id: n.id,
    data: { label: `${n.title}\n(${n.kind})` },
    position: { x: (i % 12) * 180, y: Math.floor(i / 12) * 120 },
    style: {
      background: SCOPE_COLOR[n.scope] + "22",
      border: `1px solid ${SCOPE_COLOR[n.scope]}`,
      fontSize: 12,
      padding: 6,
      borderRadius: 6,
      width: 160,
      whiteSpace: "pre-wrap",
    },
  }));
  const edges: Edge[] = g.edges
    .filter(
      (e) =>
        !e.to.startsWith("missing::") &&
        !e.from.startsWith("scope-root::") &&
        nodeIds.has(e.from) &&
        nodeIds.has(e.to),
    )
    .map((e) => {
      const edge: Edge = {
        id: e.id,
        source: e.from,
        target: e.to,
        animated: e.kind === "imports",
        style: { stroke: EDGE_COLOR[e.kind] ?? "#999" },
      };
      if (e.kind === "overrides") edge.label = "overrides";
      return edge;
    });
  return { nodes, edges };
}
