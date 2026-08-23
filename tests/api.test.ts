import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "blackout-store-"));
process.env.BLACKOUT_DATA_DIR = dataDir;
delete process.env.DATABASE_URL;

const params = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) });
const post = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let routes: {
  cases: typeof import("@/app/api/blackout/cases/route");
  caseById: typeof import("@/app/api/blackout/cases/[id]/route");
  check: typeof import("@/app/api/blackout/cases/[id]/check/route");
  hint: typeof import("@/app/api/blackout/cases/[id]/hint/route");
  waitlist: typeof import("@/app/api/waitlist/route");
  analytics: typeof import("@/app/api/analytics/route");
};
let solutionOf: (id: number) => string[];

beforeAll(async () => {
  routes = {
    cases: await import("@/app/api/blackout/cases/route"),
    caseById: await import("@/app/api/blackout/cases/[id]/route"),
    check: await import("@/app/api/blackout/cases/[id]/check/route"),
    hint: await import("@/app/api/blackout/cases/[id]/hint/route"),
    waitlist: await import("@/app/api/waitlist/route"),
    analytics: await import("@/app/api/analytics/route"),
  };
  const { getSolutionEdges } = await import("@/lib/cases.server");
  solutionOf = (id: number) => getSolutionEdges(id)!;
});

describe("GET /api/blackout/cases", () => {
  it("restituisce i metadati dei sei casi", async () => {
    const body = (await (await routes.cases.GET()).json()) as { cases: { id: number; title: string }[] };
    expect(body.cases).toHaveLength(6);
    expect(body.cases[0]).toMatchObject({ id: 1, title: "La sala delle gemme" });
    expect(JSON.stringify(body)).not.toContain("story");
  });
});

describe("GET /api/blackout/cases/:id", () => {
  it("restituisce il contenuto giocabile senza soluzione", async () => {
    const response = await routes.caseById.GET(new Request("http://localhost"), params(1));
    const body = (await response.json()) as { case: Record<string, unknown> };
    expect(body.case.id).toBe(1);
    expect(body.case).toHaveProperty("clues");
    expect(JSON.stringify(body)).not.toContain("region");
    expect(JSON.stringify(body)).not.toContain("epilogue");
  });

  it("risponde 404 su un caso inesistente", async () => {
    const response = await routes.caseById.GET(new Request("http://localhost"), params(42));
    expect(response.status).toBe(404);
  });
});

describe("POST /api/blackout/cases/:id/check", () => {
  it.each([1, 2, 3, 4, 5, 6])("caso %i: la soluzione corretta rivela sospettato e oggetto", async (id) => {
    const response = await routes.check.POST(post({ edges: solutionOf(id) }), params(id));
    const body = (await response.json()) as {
      solved: boolean;
      reveal: { suspect: { key: string }; object: { key: string }; epilogue: string };
    };
    expect(body.solved).toBe(true);
    expect(body.reveal.suspect.key).toMatch(/^[ABCD]$/);
    expect(body.reveal.object.key).toMatch(/^[1234]$/);
    expect(body.reveal.epilogue.length).toBeGreaterThan(20);
  });

  it("una soluzione sbagliata non rivela nulla", async () => {
    const response = await routes.check.POST(post({ edges: ["r0c0-top", "r0c0-left"] }), params(1));
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.solved).toBe(false);
    expect(body).not.toHaveProperty("reveal");
    expect(JSON.stringify(body)).not.toContain("epilogue");
  });

  it("rifiuta un payload malformato", async () => {
    const response = await routes.check.POST(post({ edges: "nope" }), params(1));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/blackout/cases/:id/hint", () => {
  it("restituisce i tre livelli", async () => {
    for (const level of [1, 2, 3]) {
      const response = await routes.hint.POST(post({ level, lines: [], excluded: [] }), params(1));
      const body = (await response.json()) as { hint: { level: number; lines: string[] } };
      expect(body.hint.level).toBe(level);
      if (level === 1) expect(body.hint.lines).toHaveLength(0);
      if (level === 2) expect(body.hint.lines).toHaveLength(1);
      if (level === 3) expect(body.hint.lines.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("rifiuta un livello non valido", async () => {
    const response = await routes.hint.POST(post({ level: 7 }), params(1));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/waitlist", () => {
  it("salva un'email valida", async () => {
    const response = await routes.waitlist.POST(post({ email: "Prova@Esempio.IT", source: "test" }));
    expect(response.status).toBe(200);
    const rows = fs
      .readFileSync(path.join(dataDir, "waitlist.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { email: string; source: string });
    expect(rows.at(-1)).toMatchObject({ email: "prova@esempio.it", source: "test" });
  });

  it("rifiuta un'email non valida", async () => {
    const response = await routes.waitlist.POST(post({ email: "non-una-email" }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/analytics", () => {
  it("registra gli eventi ricevuti", async () => {
    const response = await routes.analytics.POST(
      post({
        events: [
          { name: "case_complete", props: { game: "blackout", case_id: 1, anon_id: "abc" } },
          { name: "share_result", props: { game: "blackout", case_id: 1 } },
        ],
      }),
    );
    const body = (await response.json()) as { stored: number };
    expect(body.stored).toBe(2);
    const rows = fs
      .readFileSync(path.join(dataDir, "analytics.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { name: string; anonId?: string });
    expect(rows.map((row) => row.name)).toContain("case_complete");
    expect(rows.find((row) => row.name === "case_complete")?.anonId).toBe("abc");
  });

  it("ignora eventi senza nome", async () => {
    const response = await routes.analytics.POST(post({ events: [{ props: {} }] }));
    const body = (await response.json()) as { stored: number };
    expect(body.stored).toBe(0);
  });
});
