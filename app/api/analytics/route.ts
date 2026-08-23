import { getStore, type AnalyticsEvent } from "@/lib/store.server";

export const runtime = "nodejs";

interface AnalyticsBody {
  events?: unknown;
}

const MAX_EVENTS = 50;

/** Raccolta eventi proprietari. Il client invia batch con sendBeacon. */
export async function POST(request: Request) {
  let body: AnalyticsBody;
  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const events: AnalyticsEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { name, props } = item as { name?: unknown; props?: unknown };
    if (typeof name !== "string" || !name) continue;
    const safeProps = props && typeof props === "object" ? (props as Record<string, unknown>) : {};
    events.push({
      name: name.slice(0, 60),
      anonId: typeof safeProps.anon_id === "string" ? safeProps.anon_id.slice(0, 80) : undefined,
      props: safeProps,
    });
  }

  if (events.length === 0) return Response.json({ ok: true, stored: 0 });

  try {
    await getStore().saveEvents(events);
  } catch {
    return Response.json({ error: "storage_error" }, { status: 500 });
  }
  return Response.json({ ok: true, stored: events.length });
}
