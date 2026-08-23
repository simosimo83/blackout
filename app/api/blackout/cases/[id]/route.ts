import { getPlayableCase } from "@/lib/cases.server";

export const runtime = "nodejs";

/** Contenuto giocabile di un caso: senza soluzione, regione, colpevole, epilogo. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playable = getPlayableCase(Number(id));
  if (!playable) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ case: playable });
}
