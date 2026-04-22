import { splitFrontmatter, joinFrontmatter } from "./frontmatter";

export interface ParsedSkill {
  name: string;
  description: string;
  author: string | null;
  body: string;
  extraFrontmatter: Record<string, unknown>;
}

export function parseSkill(src: string): ParsedSkill {
  const { frontmatter, body } = splitFrontmatter(src);
  const { name, description, author, ...extra } = frontmatter as {
    name?: string;
    description?: string;
    author?: string;
  };
  return {
    name: name ?? "",
    description: description ?? "",
    author: typeof author === "string" ? author : null,
    body,
    extraFrontmatter: extra,
  };
}

export function serializeSkill(p: ParsedSkill): string {
  const fm: Record<string, unknown> = {
    name: p.name,
    description: p.description,
    ...p.extraFrontmatter,
  };
  if (p.author) fm.author = p.author;
  return joinFrontmatter(fm, p.body);
}
