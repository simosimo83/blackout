/**
 * Progressi del giocatore, salvati in `localStorage`. Nessun account.
 * Tutte le funzioni sono sicure anche durante il render lato server:
 * senza `window` restituiscono uno stato vuoto.
 */
import type { EdgeId } from "./slitherlink";

export const STORAGE_KEY = "blackout.progress.v1";
export const TOTAL_CASES = 6;

export interface CaseProgress {
  started: boolean;
  completed: boolean;
  lines: EdgeId[];
  excluded: EdgeId[];
  elapsedMs: number;
  wrongChecks: number;
  hintsUsed: number;
  bestTimeMs: number | null;
  bestHints: number | null;
  bestWrongChecks: number | null;
  lastPlayedAt: number | null;
  firstInteraction: boolean;
}

export interface Progress {
  version: 1;
  anonId: string;
  createdAt: number;
  lastSessionAt: number;
  sessions: number;
  tutorialCompleted: boolean;
  waitlistSubmitted: boolean;
  waitlistPrompted: boolean;
  cases: Record<string, CaseProgress>;
}

export function emptyCaseProgress(): CaseProgress {
  return {
    started: false,
    completed: false,
    lines: [],
    excluded: [],
    elapsedMs: 0,
    wrongChecks: 0,
    hintsUsed: 0,
    bestTimeMs: null,
    bestHints: null,
    bestWrongChecks: null,
    lastPlayedAt: null,
    firstInteraction: false,
  };
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `anon-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function emptyProgress(): Progress {
  const now = Date.now();
  return {
    version: 1,
    anonId: randomId(),
    createdAt: now,
    lastSessionAt: now,
    sessions: 1,
    tutorialCompleted: false,
    waitlistSubmitted: false,
    waitlistPrompted: false,
    cases: {},
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Normalizza un oggetto salvato in precedenza, tollerando campi mancanti. */
function hydrate(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<Progress>;
  const cases: Record<string, CaseProgress> = {};
  for (const [key, value] of Object.entries(data.cases ?? {})) {
    cases[key] = { ...emptyCaseProgress(), ...(value as Partial<CaseProgress>) };
  }
  return {
    ...base,
    ...data,
    version: 1,
    anonId: typeof data.anonId === "string" && data.anonId ? data.anonId : base.anonId,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : base.createdAt,
    sessions: typeof data.sessions === "number" ? data.sessions : 1,
    cases,
  };
}

export function loadProgress(): Progress {
  if (!isBrowser()) return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return hydrate(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  const stored: Progress = { ...progress, lastSessionAt: Date.now() };
  snapshot = stored;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* quota o modalità privata: si continua senza salvataggio */
    }
  }
  emit();
}

/* ------------------------ sottoscrizione allo stato ----------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshot: Progress | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Iscrive un ascoltatore alle modifiche dei progressi (anche da altre schede).
 * Pensata per `useSyncExternalStore`.
 */
export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshot = null;
      listener();
    }
  };
  if (isBrowser()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", onStorage);
  };
}

/** Istantanea stabile dei progressi: la stessa finché non cambia nulla. */
export function progressSnapshot(): Progress {
  if (!snapshot) snapshot = loadProgress();
  return snapshot;
}

export function updateProgress(mutate: (progress: Progress) => Progress): Progress {
  const next = mutate(loadProgress());
  saveProgress(next);
  return next;
}

export function getCaseProgress(progress: Progress, caseId: number): CaseProgress {
  return progress.cases[String(caseId)] ?? emptyCaseProgress();
}

export function setCaseProgress(
  progress: Progress,
  caseId: number,
  patch: Partial<CaseProgress>,
): Progress {
  const current = getCaseProgress(progress, caseId);
  return {
    ...progress,
    cases: { ...progress.cases, [String(caseId)]: { ...current, ...patch, lastPlayedAt: Date.now() } },
  };
}

/** Il caso 1 è sempre aperto; gli altri richiedono il precedente completato. */
export function isUnlocked(progress: Progress, caseId: number): boolean {
  if (caseId <= 1) return true;
  return getCaseProgress(progress, caseId - 1).completed;
}

export type CaseStatus = "locked" | "new" | "inProgress" | "done";

export function caseStatus(progress: Progress, caseId: number): CaseStatus {
  const current = getCaseProgress(progress, caseId);
  if (current.completed) return "done";
  if (!isUnlocked(progress, caseId)) return "locked";
  if (current.started || current.lines.length > 0 || current.elapsedMs > 0) return "inProgress";
  return "new";
}

export function completedCount(progress: Progress): number {
  return Object.values(progress.cases).filter((c) => c.completed).length;
}

/** Primo caso non ancora completato e sbloccato: la CTA "gioca". */
export function nextPlayableCase(progress: Progress): number {
  for (let id = 1; id <= TOTAL_CASES; id++) {
    if (!getCaseProgress(progress, id).completed) return id;
  }
  return TOTAL_CASES;
}

export function resetProgress(): void {
  snapshot = null;
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorato */
    }
  }
  emit();
}

/** Registra l'apertura di una nuova sessione e dice se è un ritorno. */
export function markSession(): { progress: Progress; returning: boolean } {
  const progress = loadProgress();
  const returning = progress.sessions > 0 && Date.now() - progress.lastSessionAt > 30 * 60 * 1000;
  const next: Progress = {
    ...progress,
    sessions: returning ? progress.sessions + 1 : progress.sessions,
    lastSessionAt: Date.now(),
  };
  saveProgress(next);
  return { progress: next, returning: returning || progress.sessions > 1 };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
