import { checkSolution } from "@/lib/cases.server";

export const runtime = "nodejs";

interface CheckBody {
  edges?: unknown;
}

/**
 * Verifica il circuito disegnato.
 * In caso di errore la risposta contiene solo gli indizi incompatibili:
 * non rivela mai quali bordi siano corretti.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: CheckBody;
  try {
    body = (await request.json()) as CheckBody;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const edges = Array.isArray(body.edges) ? body.edges.filter((e): e is string => typeof e === "string") : null;
  if (!edges) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (edges.length > 400) return Response.json({ error: "too_many_edges" }, { status: 400 });

  const result = checkSolution(Number(id), edges);
  if (!result) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(result);
}
