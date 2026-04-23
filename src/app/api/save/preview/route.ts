import { NextResponse } from "next/server";
import { z } from "zod";
import { previewDiff } from "@/core/save/preview";

const Schema = z.object({
  sourceFile: z.string(),
  scopeRoot: z.string(),
  nextContent: z.string(),
  expectedMtimeMs: z.number(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const res = await previewDiff(parsed.data);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
