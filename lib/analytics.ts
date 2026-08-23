/**
 * Analytics lato client.
 *
 * Provider configurabili con `NEXT_PUBLIC_ANALYTICS_PROVIDER` (lista separata
 * da virgole): `internal` (default, POST su /api/analytics), `plausible`,
 * `ga`, `posthog`, `none`. Lo script del provider esterno si carica con
 * `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` (+ `NEXT_PUBLIC_ANALYTICS_DOMAIN`).
 */
import { loadProgress } from "./progress";

export type EventName =
  | "landing_view"
  | "play_cta_click"
  | "tutorial_start"
  | "tutorial_complete"
  | "case_start"
  | "first_interaction"
  | "hint_used"
  | "check_attempt"
  | "case_complete"
  | "next_case_click"
  | "share_result"
  | "email_capture_view"
  | "email_submitted";

export interface EventProps {
  case_id?: number;
  difficulty?: number;
  duration_seconds?: number;
  wrong_checks?: number;
  hints_used?: number;
  [key: string]: unknown;
}

const ATTRIBUTION_KEY = "blackout.attribution.v1";

interface Attribution {
  utm_source: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
    posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void };
    dataLayer?: unknown[];
  }
}

function providers(): string[] {
  const raw = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "internal";
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (width < 640) return "mobile";
  if (width < 1024 && touch) return "tablet";
  return "desktop";
}

/** UTM e referrer della prima pagina vista, conservati per tutta la sessione. */
function attribution(): Attribution {
  const empty: Attribution = { utm_source: null, utm_campaign: null, referrer: null };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
    const params = new URLSearchParams(window.location.search);
    const value: Attribution = {
      utm_source: params.get("utm_source"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
    };
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
    return value;
  } catch {
    return empty;
  }
}

function baseProps(): Record<string, unknown> {
  const progress = loadProgress();
  const attr = attribution();
  return {
    game: "blackout",
    device_type: deviceType(),
    utm_source: attr.utm_source,
    utm_campaign: attr.utm_campaign,
    referrer: attr.referrer,
    new_or_returning: progress.sessions > 1 ? "returning" : "new",
    anon_id: progress.anonId,
  };
}

let queue: { name: EventName; props: Record<string, unknown> }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (typeof window === "undefined" || queue.length === 0) return;
  const payload = JSON.stringify({ events: queue });
  queue = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    /* si prova con fetch */
  }
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function enqueue(name: EventName, props: Record<string, unknown>): void {
  queue.push({ name, props });
  if (queue.length >= 10) {
    flush();
    return;
  }
  if (!flushTimer) flushTimer = setTimeout(flush, 2000);
}

/** Invia un evento a tutti i provider configurati. */
export function track(name: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  const enriched = { ...baseProps(), ...props };
  const active = providers();
  if (active.includes("none")) return;
  if (active.includes("internal")) enqueue(name, enriched);
  if (active.includes("plausible")) window.plausible?.(name, { props: enriched });
  if (active.includes("ga")) window.gtag?.("event", name, enriched);
  if (active.includes("posthog")) window.posthog?.capture?.(name, enriched);
  if (process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1") {
    console.info("[analytics]", name, enriched);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export const analyticsInternals = { flush, providers, deviceType };
