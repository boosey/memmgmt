import { NextResponse } from "next/server";
import { resolveHomePaths } from "@/core/paths";
import { crawl } from "@/core/discovery/crawler";
import { buildPayload } from "@/core/graph/transform";
import {
  resolveBrokenImport,
  type ResolveImportRequest,
} from "@/core/save/resolveImport";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResolveImportRequest;
    const paths = resolveHomePaths();

    // Re-crawl to get current entities for resolution
    const { raws, ghostSlugs, slugMetadata, crawledAtMs } = await crawl({
      claudeHome: paths.claudeHome,
    });
    const { payload } = buildPayload({
      raws,
      slugMetadata,
      ghostSlugs,
      crawledAtMs,
    });

    const result = await resolveBrokenImport(body, {
      backupsDir: paths.backupsDir,
      knownEntities: payload.entities,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: (e as Error).message },
      { status: 500 },
    );
  }
}
