"use client";
import type { CSSProperties, ReactNode } from "react";

export function ecBtnClass(
  primary = false,
  destructive = false,
): { className: string; style?: CSSProperties } {
  if (destructive) {
    return {
      className:
        "cursor-pointer rounded-sm border px-[11px] py-[5px] text-[11.5px] font-medium",
      style: primary
        ? {
            background: "var(--semantic-error)",
            color: "var(--paper)",
            borderColor: "var(--semantic-error)",
          }
        : {
            background: "transparent",
            color: "var(--semantic-error)",
            borderColor: "var(--semantic-error)",
          },
    };
  }
  return {
    className: [
      "cursor-pointer rounded-sm border px-[11px] py-[5px] text-[11.5px] font-medium",
      primary
        ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
        : "border-[color:var(--ink)] bg-transparent text-[color:var(--ink)]",
    ].join(" "),
  };
}

export interface FormRowProps {
  label: string;
  hint?: string;
  note?: string;
  children: ReactNode;
}

export function FormRow({ label, hint, note, children }: FormRowProps) {
  return (
    <div className="mb-[14px]">
      <div className="mb-[5px] flex items-baseline gap-2">
        <span className="smallcaps text-[10px] tracking-[0.18em] text-[color:var(--text-muted)]">
          {label}
        </span>
        {note && (
          <span className="font-mono text-[10px] text-[color:var(--text-faint)]">
            · {note}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <div className="mt-[4px] text-[11.5px] leading-[1.45] text-[color:var(--text-faint)]">
          {hint}
        </div>
      )}
    </div>
  );
}

export interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
  title?: string;
}

export function Chip({ label, active, onClick, danger, title }: ChipProps) {
  const c = danger ? "var(--semantic-error)" : "var(--ink)";
  const style: CSSProperties = active
    ? { background: c, borderColor: c, color: "var(--paper)" }
    : { borderColor: "var(--rule)", color: c, background: "transparent" };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={style}
      className="cursor-pointer rounded-sm border px-[10px] py-[4px] text-[11.5px] font-medium"
    >
      {label}
    </button>
  );
}

export function fieldClass(): string {
  return "w-full rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)] px-[10px] py-2 text-[13.5px] text-[color:var(--ink)] outline-none leading-[1.5] resize-y";
}

export function monoClass(): string {
  return "w-full rounded-sm border border-[color:var(--rule)] bg-[color:var(--paper)] px-[10px] py-2 font-mono text-[12.5px] text-[color:var(--ink)] outline-none leading-[1.5]";
}
