export type McpTransport = "stdio" | "http" | "sse" | "unknown";

export interface ParsedMcpServer {
  name: string;
  transport: McpTransport;
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
  enabled: boolean;
  raw: Record<string, unknown>;
}

function classifyTransport(raw: Record<string, unknown>): McpTransport {
  const explicit = raw.type ?? raw.transport;
  if (typeof explicit === "string") {
    const t = explicit.toLowerCase();
    if (t === "stdio" || t === "http" || t === "sse") return t;
  }
  if (typeof raw.url === "string") return "http";
  if (typeof raw.command === "string") return "stdio";
  return "unknown";
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function coerceEnv(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v !== null && v !== undefined) out[k] = String(v);
  }
  return out;
}

/**
 * Lift a single mcpServers[name] object into a ParsedMcpServer.
 * The raw object is preserved for round-trip serialization.
 */
export function parseMcpServerEntry(
  name: string,
  raw: unknown,
): ParsedMcpServer {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const enabledRaw = obj.enabled ?? obj.disabled;
  let enabled = true;
  if (typeof obj.enabled === "boolean") enabled = obj.enabled;
  else if (typeof obj.disabled === "boolean") enabled = !obj.disabled;
  else if (enabledRaw === undefined) enabled = true;

  return {
    name,
    transport: classifyTransport(obj),
    command: typeof obj.command === "string" ? obj.command : null,
    args: coerceStringArray(obj.args),
    url: typeof obj.url === "string" ? obj.url : null,
    env: coerceEnv(obj.env),
    enabled,
    raw: obj,
  };
}

/**
 * Extract all mcp-server entries from a settings.json raw object.
 */
export function extractMcpServers(
  settingsRaw: Record<string, unknown>,
): ParsedMcpServer[] {
  const mcp = settingsRaw.mcpServers;
  if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) return [];
  return Object.entries(mcp as Record<string, unknown>).map(([name, raw]) =>
    parseMcpServerEntry(name, raw),
  );
}
