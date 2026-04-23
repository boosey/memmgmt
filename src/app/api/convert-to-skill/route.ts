import { NextResponse } from "next/server";
import { z } from "zod";
import { convertCommandToSkill } from "@/core/save/convert";
import { resolveHomePaths } from "@/core/paths";
import { getOrBuildGraph, invalidate } from "@/lib/graphCache";

const Schema = z.object({
  commandId: z.string(),
  newSkillName: z.string(),
  newSkillDescription: z.string(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { backupsDir } = resolveHomePaths();
  const { payload } = await getOrBuildGraph();
  const res = await convertCommandToSkill(parsed.data, {
    backupsDir,
    knownEntities: payload.entities,
  });
  if (res.ok) invalidate();
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
