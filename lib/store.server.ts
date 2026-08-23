import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * Persistenza minima: solo email della lista d'attesa ed eventi analytics
 * proprietari. Nessun dato di gioco, nessun account.
 *
 * Driver scelto dalle variabili d'ambiente:
 *  - `DATABASE_URL`  -> Postgres (Railway, Neon, Supabase, RDS…)
 *  - altrimenti      -> file JSONL in `BLACKOUT_DATA_DIR` (default `.data/`)
 *  - filesystem in sola lettura (es. Vercel) -> memoria del processo
 */

export interface WaitlistEntry {
  email: string;
  anonId?: string;
  source?: string;
  utmSource?: string;
  utmCampaign?: string;
  referrer?: string;
}

export interface AnalyticsEvent {
  name: string;
  anonId?: string;
  props: Record<string, unknown>;
}

export interface Store {
  readonly driver: "postgres" | "file" | "memory";
  saveWaitlist(entry: WaitlistEntry): Promise<void>;
  saveEvents(events: AnalyticsEvent[]): Promise<void>;
}

/* --------------------------------- memoria -------------------------------- */

class MemoryStore implements Store {
  readonly driver = "memory" as const;
  readonly waitlist: (WaitlistEntry & { createdAt: string })[] = [];
  readonly events: (AnalyticsEvent & { createdAt: string })[] = [];

  async saveWaitlist(entry: WaitlistEntry) {
    this.waitlist.push({ ...entry, createdAt: new Date().toISOString() });
  }

  async saveEvents(events: AnalyticsEvent[]) {
    const createdAt = new Date().toISOString();
    for (const event of events) this.events.push({ ...event, createdAt });
  }
}

/* ---------------------------------- file ---------------------------------- */

class FileStore implements Store {
  readonly driver = "file" as const;
  private fallback = new MemoryStore();

  constructor(private readonly dir: string) {}

  private append(file: string, rows: object[]): boolean {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.appendFileSync(
        path.join(this.dir, file),
        rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
        "utf8",
      );
      return true;
    } catch {
      return false; // filesystem in sola lettura: si continua in memoria
    }
  }

  async saveWaitlist(entry: WaitlistEntry) {
    const row = { ...entry, createdAt: new Date().toISOString() };
    if (!this.append("waitlist.jsonl", [row])) await this.fallback.saveWaitlist(entry);
  }

  async saveEvents(events: AnalyticsEvent[]) {
    const createdAt = new Date().toISOString();
    const rows = events.map((event) => ({ ...event, createdAt }));
    if (!this.append("analytics.jsonl", rows)) await this.fallback.saveEvents(events);
  }
}

/* -------------------------------- postgres -------------------------------- */

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
};

class PostgresStore implements Store {
  readonly driver = "postgres" as const;
  private pool: PgPool | null = null;
  private ready: Promise<PgPool> | null = null;

  constructor(private readonly url: string) {}

  private connect(): Promise<PgPool> {
    if (!this.ready) {
      this.ready = (async () => {
        const { Pool } = await import("pg");
        const pool = new Pool({
          connectionString: this.url,
          ssl: this.url.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
          max: 3,
        }) as unknown as PgPool;
        await pool.query(`
          CREATE TABLE IF NOT EXISTS blackout_waitlist (
            id          bigserial PRIMARY KEY,
            email       text NOT NULL UNIQUE,
            anon_id     text,
            source      text,
            utm_source  text,
            utm_campaign text,
            referrer    text,
            created_at  timestamptz NOT NULL DEFAULT now()
          )`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS blackout_events (
            id         bigserial PRIMARY KEY,
            name       text NOT NULL,
            anon_id    text,
            props      jsonb NOT NULL DEFAULT '{}'::jsonb,
            created_at timestamptz NOT NULL DEFAULT now()
          )`);
        this.pool = pool;
        return pool;
      })();
    }
    return this.ready;
  }

  async saveWaitlist(entry: WaitlistEntry) {
    const pool = this.pool ?? (await this.connect());
    await pool.query(
      `INSERT INTO blackout_waitlist (email, anon_id, source, utm_source, utm_campaign, referrer)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [entry.email, entry.anonId ?? null, entry.source ?? null, entry.utmSource ?? null, entry.utmCampaign ?? null, entry.referrer ?? null],
    );
  }

  async saveEvents(events: AnalyticsEvent[]) {
    if (events.length === 0) return;
    const pool = this.pool ?? (await this.connect());
    for (const event of events) {
      await pool.query(`INSERT INTO blackout_events (name, anon_id, props) VALUES ($1, $2, $3)`, [
        event.name,
        event.anonId ?? null,
        JSON.stringify(event.props ?? {}),
      ]);
    }
  }
}

/* --------------------------------- factory -------------------------------- */

let instance: Store | null = null;

export function getStore(): Store {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (url) instance = new PostgresStore(url);
  else if (process.env.BLACKOUT_STORE === "memory") instance = new MemoryStore();
  else instance = new FileStore(process.env.BLACKOUT_DATA_DIR ?? path.join(process.cwd(), ".data"));
  return instance;
}

/** Solo per i test. */
export function resetStore(): void {
  instance = null;
}
