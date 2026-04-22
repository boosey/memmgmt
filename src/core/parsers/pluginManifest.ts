export interface ParsedPluginManifest {
  name: string;
  version: string | null;
  description: string | null;
  author: string | null;
  publisher: string | null;
  raw: Record<string, unknown>;
}

export function parsePluginManifest(
  src: string,
  filePath: string,
): ParsedPluginManifest {
  const raw = (JSON.parse(src) ?? {}) as Record<string, unknown>;
  const isPkgJson = filePath.endsWith("package.json");
  const fm = isPkgJson
    ? ((raw.claudePlugin as Record<string, unknown> | undefined) ?? {})
    : raw;

  const rawAuthor =
    fm.author ??
    (Array.isArray(fm.authors) ? (fm.authors as string[])[0] : null);

  let author: string | null = null;
  if (typeof rawAuthor === "string") {
    author = rawAuthor;
  } else if (
    rawAuthor &&
    typeof rawAuthor === "object" &&
    "name" in (rawAuthor as object)
  ) {
    author = String((rawAuthor as { name: string }).name);
  }

  return {
    name: String(fm.name ?? raw.name ?? ""),
    version: ((fm.version ?? raw.version) as string | null) ?? null,
    description: (fm.description as string | null | undefined) ?? null,
    author,
    publisher: typeof fm.publisher === "string" ? fm.publisher : null,
    raw,
  };
}
