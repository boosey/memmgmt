"use client";
import { useState } from "react";
import type { Entity } from "@/core/entities";
import type {
  ConvertToSkillRequest,
  ConvertToSkillResponse,
} from "@/core/apiContracts";
import { DiffPreviewModal } from "../DiffPreviewModal";
import { showUndoToast } from "../UndoToast";
import { FormRow, ecBtnClass, fieldClass, monoClass } from "./shared";

interface ConvertToSkillProps {
  command: Entity;
  onConverted: (resp: Extract<ConvertToSkillResponse, { ok: true }>) => void;
}

export function ConvertToSkill({ command, onConverted }: ConvertToSkillProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSkillName, setNewSkillName] = useState(
    (command.title ?? "").replace(/^\/+/, ""),
  );
  const [newSkillDesc, setNewSkillDesc] = useState(command.intent ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffBefore, setDiffBefore] = useState("");
  const [diffAfter, setDiffAfter] = useState("");

  const ghost = ecBtnClass();
  const primary = ecBtnClass(true);
  const cancelBtn = ecBtnClass();

  async function previewDiff() {
    // Preview shows the delta between current command file and the projected
    // new skill file. Same endpoint as regular preview — we craft the
    // "nextContent" from the current body plus skill-style frontmatter.
    setError(null);
    const body = (command.structured as { body?: string } | null)?.body ?? "";
    const nextContent =
      `---\nname: ${newSkillName}\ndescription: ${newSkillDesc}\n---\n${body}`;
    try {
      const r = await fetch("/api/save/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceFile: command.sourceFile,
          scopeRoot: command.scopeRoot,
          nextContent,
          expectedMtimeMs: command.mtimeMs,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(String(j.reason ?? j.message ?? "preview failed"));
        return;
      }
      setDiffBefore(j.before);
      setDiffAfter(j.after);
      setDiffOpen(true);
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  async function convert() {
    setPending(true);
    setError(null);
    try {
      const body: ConvertToSkillRequest = {
        commandId: command.id,
        newSkillName: newSkillName.trim(),
        newSkillDescription: newSkillDesc.trim(),
      };
      const r = await fetch("/api/convert-to-skill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as ConvertToSkillResponse;
      if (!j.ok) {
        setError(String(j.reason ?? j.message ?? "convert failed"));
        return;
      }
      showUndoToast(
        {
          sourceFile: j.commandDeletedPath,
          scopeRoot: command.scopeRoot,
          label: `Converted /${newSkillName} to Skill`,
        },
      );
      onConverted(j);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      data-testid="convert-to-skill"
      className="mt-[14px] rounded-sm border border-[color:var(--rule-soft)] bg-[color:var(--paper-deep)] px-[14px] py-[12px]"
      style={{ borderLeft: "3px solid oklch(0.55 0.11 245)" }}
    >
      <div className="mb-[4px] flex items-center gap-[10px]">
        <span className="smallcaps text-[10px] tracking-[0.18em] text-[color:var(--text-muted)]">
          Convert
        </span>
        <span className="text-[13px] font-medium text-[color:var(--ink)]">
          Make this a Skill instead
        </span>
        <span className="flex-1" />
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={ghost.className}
            style={ghost.style}
          >
            Convert to Skill…
          </button>
        )}
      </div>
      <div className="text-[11.5px] leading-[1.5] text-[color:var(--text-muted)]">
        Skills are triggered by Claude when their description matches; commands
        are invoked explicitly with{" "}
        <span className="font-mono text-[color:var(--ink)]">/name</span>. The
        prompt body carries over unchanged — only the invocation style and file
        location change.
      </div>

      {expanded && (
        <div className="mt-[12px] rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)] px-[14px] py-[12px]">
          <div className="smallcaps mb-[8px] text-[9.5px] tracking-[0.18em] text-[color:var(--text-muted)]">
            Review before converting
          </div>
          <FormRow
            label="Skill name"
            note="folder name"
            hint="Must be unique among skills in this scope."
          >
            <input
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className={monoClass()}
            />
          </FormRow>
          <FormRow
            label="Skill description"
            hint="Claude reads this when deciding whether to auto-invoke. Be specific about when it should run."
          >
            <textarea
              value={newSkillDesc}
              onChange={(e) => setNewSkillDesc(e.target.value)}
              rows={2}
              className={fieldClass()}
            />
          </FormRow>

          <div
            className="mt-[4px] rounded-sm border border-dashed border-[color:var(--rule)] bg-[color:var(--paper-deep)] px-[12px] py-[10px]"
          >
            <div className="smallcaps mb-[6px] text-[9.5px] tracking-[0.16em] text-[color:var(--text-muted)]">
              What this does
            </div>
            <ul className="m-0 pl-[18px] text-[12px] leading-[1.6] text-[color:var(--ink)]">
              <li>
                Write prompt body to{" "}
                <span className="font-mono text-[color:var(--ink)]">
                  {`skills/${newSkillName}.md`}
                </span>{" "}
                with frontmatter{" "}
                <span className="font-mono text-[color:var(--text-muted)]">
                  name + description
                </span>
                .
              </li>
              <li>
                Back up original{" "}
                <span className="font-mono text-[color:var(--text-muted)]">
                  {`commands/${(command.title ?? "").replace(/^\//, "")}.md`}
                </span>
                , then delete it.
              </li>
              <li>
                Rewrite any relations pointing at this command to point at the
                new skill.
              </li>
              <li>
                The slash-invocation{" "}
                <span className="font-mono text-[color:var(--ink)]">
                  /{(command.title ?? "").replace(/^\//, "")}
                </span>{" "}
                will no longer work — auto-invocation takes over.
              </li>
            </ul>
          </div>

          <div className="mt-[10px] flex gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              disabled={pending}
              className={cancelBtn.className}
              style={cancelBtn.style}
            >
              cancel
            </button>
            <button
              type="button"
              onClick={previewDiff}
              disabled={pending}
              className={primary.className}
              style={primary.style}
            >
              Preview conversion diff
            </button>
            <button
              type="button"
              onClick={convert}
              disabled={pending || !newSkillName.trim()}
              className={primary.className}
              style={primary.style}
            >
              {pending ? "converting…" : "Convert & back up"}
            </button>
          </div>
          {error && (
            <div
              className="mt-2 text-[11.5px]"
              style={{ color: "var(--semantic-error)" }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      <DiffPreviewModal
        open={diffOpen}
        title={`Convert /${(command.title ?? "").replace(/^\//, "")} → Skill`}
        before={diffBefore}
        after={diffAfter}
        onClose={() => setDiffOpen(false)}
      />
    </div>
  );
}
