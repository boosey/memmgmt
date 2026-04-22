import YAML from "yaml";

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(src: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const m = FM_RE.exec(src);
  if (!m) return { frontmatter: {}, body: src };
  const yaml = m[1]!;
  const body = m[2] ?? "";
  const fm = YAML.parse(yaml) ?? {};
  return {
    frontmatter:
      typeof fm === "object" && !Array.isArray(fm)
        ? (fm as Record<string, unknown>)
        : {},
    body,
  };
}

export function joinFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return body;
  const yaml = YAML.stringify(frontmatter).trimEnd();
  return `---\n${yaml}\n---\n${body.startsWith("\n") ? body.slice(1) : body}`;
}
