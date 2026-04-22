export interface ParsedKeybindings {
  raw: Record<string, string>;
  entries: { chord: string; action: string }[];
}

export function parseKeybindings(src: string): ParsedKeybindings {
  const raw = (JSON.parse(src) ?? {}) as Record<string, string>;
  const entries = Object.entries(raw).map(([chord, action]) => ({
    chord,
    action,
  }));
  return { raw, entries };
}

export function serializeKeybindings(p: ParsedKeybindings): string {
  return JSON.stringify(p.raw, null, 2) + "\n";
}
