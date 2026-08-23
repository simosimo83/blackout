import { getStore } from "@/lib/store.server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

interface WaitlistBody {
  email?: unknown;
  anonId?: unknown;
  source?: unknown;
  utmSource?: unknown;
  utmCampaign?: unknown;
  referrer?: unknown;
}

const text = (value: unknown, max = 200): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Salva un'email per la lista d'attesa. Nessun altro dato personale. */
export async function POST(request: Request) {
  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = text(body.email, 254)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: "invalid_email" }, { status: 400 });

  try {
    await getStore().saveWaitlist({
      email,
      anonId: text(body.anonId, 80),
      source: text(body.source, 40),
      utmSource: text(body.utmSource, 120),
      utmCampaign: text(body.utmCampaign, 120),
      referrer: text(body.referrer, 300),
    });
  } catch {
    return Response.json({ error: "storage_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
