import { splitFrontmatter, joinFrontmatter } from "./frontmatter";

export interface ParsedCommand {
  description: string;
  author: string | null;
  body: string;
  extraFrontmatter: Record<string, unknown>;
}

export function parseCommand(src: string): ParsedCommand {
  const { frontmatter, body } = splitFrontmatter(src);
  const { description, author, ...extra } = frontmatter as {
    description?: string;
    author?: string;
  };
  return {
    description: description ?? "",
    author: typeof author === "string" ? author : null,
    body,
    extraFrontmatter: extra,
  };
}

export function serializeCommand(p: ParsedCommand): string {
  const fm: Record<string, unknown> = {
    description: p.description,
    ...p.extraFrontmatter,
  };
  if (p.author) fm.author = p.author;
  return joinFrontmatter(fm, p.body);
}
