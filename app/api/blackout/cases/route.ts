import { getCaseMetas } from "@/lib/cases.server";

export const runtime = "nodejs";

/** Metadati dei sei casi: nessun contenuto sensibile. */
export async function GET() {
  return Response.json({ cases: getCaseMetas() });
}
