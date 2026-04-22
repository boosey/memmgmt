"use client";
import { Button } from "@/components/ui/button";

export interface TopBarProps {
  activeTab: "inventory" | "graph";
  onTabChange: (t: "inventory" | "graph") => void;
  showConnections: boolean;
  onToggleConnections: (v: boolean) => void;
}

export function TopBar(p: TopBarProps) {
  return (
    <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 sticky top-0 z-10">
      <div className="text-lg font-semibold">memmgmt</div>
      <nav className="flex gap-1 ml-4">
        <Button
          variant={p.activeTab === "inventory" ? "default" : "ghost"}
          size="sm"
          onClick={() => p.onTabChange("inventory")}
        >
          Inventory
        </Button>
        <Button
          variant={p.activeTab === "graph" ? "default" : "ghost"}
          size="sm"
          onClick={() => p.onTabChange("graph")}
        >
          Graph
        </Button>
      </nav>
      {p.activeTab === "inventory" && (
        <label className="ml-auto flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={p.showConnections}
            onChange={(e) => p.onToggleConnections(e.target.checked)}
          />
          Show connections
        </label>
      )}
    </header>
  );
}
