import { getHint } from "@/lib/cases.server";
import type { HintLevel } from "@/lib/types";

export const runtime = "nodejs";

interface HintBody {
  level?: unknown;
  lines?: unknown;
  excluded?: unknown;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 400) : [];

/** Suggerimento del livello richiesto, calcolato sullo stato attuale della griglia. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: HintBody;
  try {
    body = (await request.json()) as HintBody;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const level = Number(body.level);
  if (![1, 2, 3].includes(level)) return Response.json({ error: "invalid_level" }, { status: 400 });

  const hint = getHint(Number(id), level as HintLevel, {
    lines: strings(body.lines),
    excluded: strings(body.excluded),
  });
  if (!hint) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ hint });
}
