"use client";
import { useMemo, useRef, useState, useEffect } from "react";

// Match the separator style the server uses for scopeRoot — on Windows the
// crawler emits "C:\\Users\\..." with backslashes; on Unix it's forward
// slashes. Constructed file paths must match exactly so findExistingForFile
// can locate the file's current content + mtime in the loaded graph.
function joinPath(scopeRoot: string, ...parts: string[]): string {
  const sep = scopeRoot.includes("\\") && !scopeRoot.includes("/") ? "\\" : "/";
  return [scopeRoot, ...parts].join(sep);
}

import type {
  Entity,
  EntityType,
  PseudoNode,
  Scope,
  SlugPseudoNode,
} from "@/core/entities";
import { createBlankEntity } from "@/lib/blankEntity";
import { TYPE_LABELS } from "./typeLabels";
import { ecBtnClass } from "./editors/shared";

const SUPPORTED_TYPES = new Set<EntityType>([
  "standing-instruction",
  "permission",
  "skill",
  "command",
  "memory",
]);

export function isCreatableType(t: EntityType): boolean {
  return SUPPORTED_TYPES.has(t);
}

interface AddNewButtonProps {
  activeType: EntityType;
  entities: readonly Entity[];
  pseudoNodes: readonly PseudoNode[];
  activeProject: SlugPseudoNode | null;
  onCreate: (e: Entity) => void;
}

interface TargetOption {
  label: string;
  scope: Scope;
  scopeRoot: string;
  sourceFile: string;
  slugRef?: string;
  /** Pre-fill structured (e.g. permission group default). */
  structured?: unknown;
}

export function AddNewButton({
  activeType,
  entities,
  pseudoNodes,
  activeProject,
  onCreate,
}: AddNewButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options = useMemo<TargetOption[]>(
    () => computeTargets(activeType, entities, pseudoNodes, activeProject),
    [activeType, entities, pseudoNodes, activeProject],
  );

  if (!SUPPORTED_TYPES.has(activeType)) return null;
  const label = TYPE_LABELS[activeType]?.label ?? activeType;
  const primary = ecBtnClass(true);

  function pick(opt: TargetOption) {
    const existing = findExistingForFile(entities, opt.sourceFile);
    const blank = createBlankEntity({
      type: activeType,
      scope: opt.scope,
      scopeRoot: opt.scopeRoot,
      sourceFile: opt.sourceFile,
      ...(existing
        ? { existing: { rawContent: existing.rawContent, mtimeMs: existing.mtimeMs } }
        : {}),
      ...(opt.structured !== undefined ? { structured: opt.structured } : {}),
      ...(opt.slugRef ? { slugRef: opt.slugRef } : {}),
    });
    setOpen(false);
    onCreate(blank);
  }

  return (
    <div ref={ref} className="relative inline-block" data-testid="add-new-button">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={primary.className}
        style={primary.style}
        disabled={options.length === 0}
        title={options.length === 0 ? "No valid target locations." : undefined}
        data-testid={`add-new-${activeType}`}
      >
        + Add {label}
      </button>
      {open && options.length > 0 && (
        <div
          className="absolute left-0 z-20 mt-1 min-w-[260px] rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)] py-1 shadow-md"
          role="menu"
        >
          <div className="smallcaps px-3 py-1 text-[10px] tracking-[0.18em] text-[color:var(--text-muted)]">
            Save to…
          </div>
          {options.map((opt, i) => (
            <button
              key={`${opt.sourceFile}:${i}`}
              type="button"
              onClick={() => pick(opt)}
              className="block w-full cursor-pointer border-none bg-transparent px-3 py-1.5 text-left text-[12.5px] text-[color:var(--ink)] hover:bg-[color:var(--paper-deep)]"
              role="menuitem"
              data-testid={`add-new-target-${i}`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="font-mono text-[10.5px] text-[color:var(--text-faint)]">
                {opt.sourceFile}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function findExistingForFile(
  entities: readonly Entity[],
  sourceFile: string,
): Entity | undefined {
  for (const e of entities) if (e.sourceFile === sourceFile) return e;
  return undefined;
}

function uniqueScopeRoots(
  entities: readonly Entity[],
  scope: Scope,
): string[] {
  const s = new Set<string>();
  for (const e of entities) if (e.scope === scope) s.add(e.scopeRoot);
  return Array.from(s).sort();
}

function deriveClaudeHome(entities: readonly Entity[]): string | null {
  for (const e of entities) if (e.scope === "global") return e.scopeRoot;
  return null;
}

function computeTargets(
  type: EntityType,
  entities: readonly Entity[],
  pseudoNodes: readonly PseudoNode[],
  activeProject: SlugPseudoNode | null,
): TargetOption[] {
  const claudeHome = deriveClaudeHome(entities);
  const projectRoots = activeProject
    ? [activeProject.projectPath]
    : uniqueScopeRoots(entities, "project");
  const out: TargetOption[] = [];

  switch (type) {
    case "permission": {
      if (claudeHome) {
        out.push({
          label: "User settings",
          scope: "global",
          scopeRoot: claudeHome,
          sourceFile: joinPath(claudeHome, "settings.json"),
          structured: { kind: "permission", group: "allow" },
        });
      }
      for (const root of projectRoots) {
        out.push({
          label: "Project settings",
          scope: "project",
          scopeRoot: root,
          sourceFile: joinPath(root, ".claude", "settings.json"),
          structured: { kind: "permission", group: "allow" },
        });
        out.push({
          label: "Project local settings",
          scope: "local",
          scopeRoot: root,
          sourceFile: joinPath(root, ".claude", "settings.local.json"),
          structured: { kind: "permission", group: "allow" },
        });
      }
      break;
    }
    case "standing-instruction": {
      if (claudeHome) {
        out.push({
          label: "User CLAUDE.md",
          scope: "global",
          scopeRoot: claudeHome,
          sourceFile: joinPath(claudeHome, "CLAUDE.md"),
        });
      }
      for (const root of projectRoots) {
        out.push({
          label: "Project CLAUDE.md",
          scope: "project",
          scopeRoot: root,
          sourceFile: joinPath(root, "CLAUDE.md"),
        });
        out.push({
          label: "Project CLAUDE.local.md",
          scope: "local",
          scopeRoot: root,
          sourceFile: joinPath(root, "CLAUDE.local.md"),
        });
      }
      break;
    }
    case "skill": {
      // sourceFile is finalized in the editor from the Name input.
      // Placeholder file path here just identifies the scope.
      if (claudeHome) {
        out.push({
          label: "User skill",
          scope: "global",
          scopeRoot: claudeHome,
          sourceFile: joinPath(claudeHome, "skills", "__new__", "SKILL.md"),
        });
      }
      for (const root of projectRoots) {
        out.push({
          label: "Project skill",
          scope: "project",
          scopeRoot: root,
          sourceFile: joinPath(root, ".claude", "skills", "__new__", "SKILL.md"),
        });
      }
      break;
    }
    case "command": {
      if (claudeHome) {
        out.push({
          label: "User command",
          scope: "global",
          scopeRoot: claudeHome,
          sourceFile: joinPath(claudeHome, "commands", "__new__.md"),
        });
      }
      for (const root of projectRoots) {
        out.push({
          label: "Project command",
          scope: "project",
          scopeRoot: root,
          sourceFile: joinPath(root, ".claude", "commands", "__new__.md"),
        });
      }
      break;
    }
    case "memory": {
      // Memory lives under a slug. Offer each known slug.
      const slugs = pseudoNodes.filter(
        (p): p is SlugPseudoNode => p.kind === "slug" && !p.isGhost,
      );
      const ordered = activeProject
        ? [activeProject, ...slugs.filter((s) => s.name !== activeProject.name)]
        : slugs;
      for (const s of ordered) {
        const slugDir = derieveSlugDir(entities, s.name);
        if (!slugDir) continue;
        out.push({
          label: `Memory · ${s.name}`,
          scope: "slug",
          scopeRoot: slugDir,
          sourceFile: joinPath(slugDir, "memory", "__new__.md"),
          slugRef: s.name,
        });
      }
      break;
    }
    default:
      break;
  }
  return out;
}

function derieveSlugDir(
  entities: readonly Entity[],
  slugName: string,
): string | null {
  for (const e of entities) {
    if (e.scope === "slug" && e.slugRef === slugName) return e.scopeRoot;
  }
  return null;
}
