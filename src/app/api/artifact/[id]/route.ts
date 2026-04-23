import { NextResponse } from "next/server";
import { crawl } from "@/core/discovery";
import { buildPayload } from "@/core/graph/transform";
import { resolveHomePaths } from "@/core/paths";
import { getCachedNodes, setCached } from "@/lib/graphCache";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let nodes = getCachedNodes();
  if (!nodes) {
    const paths = resolveHomePaths();
    const { raws, ghostSlugs, slugMetadata, crawledAtMs } = await crawl({
      claudeHome: paths.claudeHome,
    });
    const built = buildPayload({ raws, slugMetadata, ghostSlugs, crawledAtMs });
    setCached(built.payload, built.nodes);
    nodes = built.nodes;
  }
  const node = nodes.find((n) => n.id === id);
  if (!node) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(node);
}
