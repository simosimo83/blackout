import fs from "node:fs";

import { describe, expect, it } from "vitest";

import {
  DATA_FILE,
  checkSolution,
  getCaseMetas,
  getHint,
  getPlayableCase,
  getReveal,
  getSolutionEdges,
} from "@/lib/cases.server";
import { solve } from "@/lib/solver";
import {
  cellEdgeIds,
  cellKey,
  clueStatuses,
  interiorCells,
  loopReport,
  regionEdgeIds,
  type Cell,
  type Clue,
  type Grid,
} from "@/lib/slitherlink";

interface RawCase {
  id: number;
  rows: number;
  cols: number;
  clues: Clue[];
  region: Cell[];
  tokens: { suspects: Record<string, Cell>; objects: Record<string, Cell> };
  answer: { suspect: string; object: string };
  epilogue: string;
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as {
  cases: RawCase[];
  verification: { case: number; loop_edges: number; inside_cells: number; clue_count: number }[];
};

const CASE_IDS = [1, 2, 3, 4, 5, 6];

describe("dati dei sei casi", () => {
  it("il file master contiene i sei casi attesi", () => {
    expect(data.cases.map((c) => c.id)).toEqual(CASE_IDS);
    expect(getCaseMetas()).toHaveLength(6);
  });

  it.each(CASE_IDS)("caso %i: gli indizi corrispondono alla soluzione", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const solution = new Set(regionEdgeIds(grid, raw.region));
    for (const [row, col, value] of raw.clues) {
      const active = cellEdgeIds(row, col, grid).filter((edge) => solution.has(edge)).length;
      expect(`${row},${col}=${active}`).toBe(`${row},${col}=${value}`);
    }
  });

  it.each(CASE_IDS)("caso %i: la soluzione è un unico circuito chiuso", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const solution = new Set(regionEdgeIds(grid, raw.region));
    const report = loopReport(grid, solution);
    expect(report.isSingleLoop).toBe(true);
    expect(report.badVertices).toEqual([]);
    expect(report.components).toBe(1);
  });

  it.each(CASE_IDS)("caso %i: la zona buia coincide con la regione dichiarata", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const solution = new Set(regionEdgeIds(grid, raw.region));
    const interior = interiorCells(grid, solution).map(cellKey).sort();
    expect(interior).toEqual(raw.region.map(cellKey).sort());
  });

  it.each(CASE_IDS)("caso %i: gli indizi ammettono una sola soluzione", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const solutions = solve(grid, raw.clues, { limit: 3 });
    expect(solutions).toHaveLength(1);
    expect(solutions[0].map(cellKey).sort()).toEqual(raw.region.map(cellKey).sort());
  });

  it.each(CASE_IDS)("caso %i: nella zona buia c'è un solo sospettato e un solo oggetto", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const inside = new Set(raw.region.map(cellKey));
    const suspects = Object.entries(raw.tokens.suspects).filter(([, cell]) => inside.has(cellKey(cell)));
    const objects = Object.entries(raw.tokens.objects).filter(([, cell]) => inside.has(cellKey(cell)));
    expect(suspects.map(([key]) => key)).toEqual([raw.answer.suspect]);
    expect(objects.map(([key]) => key)).toEqual([raw.answer.object]);
  });

  it.each(CASE_IDS)("caso %i: i numeri di verifica del file tornano", (id) => {
    const raw = data.cases.find((c) => c.id === id)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const expected = data.verification.find((v) => v.case === id)!;
    expect(regionEdgeIds(grid, raw.region)).toHaveLength(expected.loop_edges);
    expect(raw.region).toHaveLength(expected.inside_cells);
    expect(raw.clues).toHaveLength(expected.clue_count);
  });
});

describe("payload pubblico", () => {
  it.each(CASE_IDS)("caso %i: non contiene soluzione, regione, colpevole o epilogo", (id) => {
    const playable = getPlayableCase(id)!;
    const raw = data.cases.find((c) => c.id === id)!;
    const serialized = JSON.stringify(playable);
    expect(serialized).not.toContain(raw.epilogue);
    expect(serialized).not.toContain("region");
    expect(serialized).not.toContain("answer");
    expect(serialized).not.toContain("solution");
    expect(Object.keys(playable).sort()).toEqual(
      [
        "clues",
        "cols",
        "difficulty",
        "hintLevels",
        "id",
        "location",
        "objects",
        "rows",
        "story",
        "suspects",
        "time",
        "title",
      ].sort(),
    );
  });

  it("i metadati non contengono la trama né i personaggi", () => {
    const serialized = JSON.stringify(getCaseMetas());
    expect(serialized).not.toContain("suspects");
    expect(serialized).not.toContain("story");
  });
});

describe("verifica della soluzione", () => {
  it.each(CASE_IDS)("caso %i: accetta la soluzione corretta e rivela il colpevole", (id) => {
    const solution = getSolutionEdges(id)!;
    const result = checkSolution(id, solution)!;
    expect(result.solved).toBe(true);
    if (!result.solved) return;
    const raw = data.cases.find((c) => c.id === id)!;
    expect(result.reveal.suspect.key).toBe(raw.answer.suspect);
    expect(result.reveal.object.key).toBe(raw.answer.object);
    expect(result.reveal.epilogue).toBe(raw.epilogue);
    expect(result.reveal.region.map(cellKey).sort()).toEqual(raw.region.map(cellKey).sort());
  });

  it.each(CASE_IDS)("caso %i: accetta la soluzione in ordine sparso e con id equivalenti", (id) => {
    const solution = getSolutionEdges(id)!;
    const shuffled = [...solution].reverse();
    expect(checkSolution(id, shuffled)!.solved).toBe(true);
    // "r1c1-top" e "r0c1-bottom" sono lo stesso bordo
    const alternative = solution.map((edge) => {
      const match = /^r(\d+)c(\d+)-top$/.exec(edge);
      if (!match || match[1] === "0") return edge;
      return `r${Number(match[1]) - 1}c${match[2]}-bottom`;
    });
    expect(checkSolution(id, alternative)!.solved).toBe(true);
  });

  it.each(CASE_IDS)("caso %i: rifiuta una soluzione incompleta senza rivelare nulla", (id) => {
    const solution = getSolutionEdges(id)!;
    const result = checkSolution(id, solution.slice(0, solution.length - 2))!;
    expect(result.solved).toBe(false);
    if (result.solved) return;
    expect(JSON.stringify(result)).not.toContain("epilogue");
    expect(result.reason).not.toBe("wrongLoop");
  });

  it("rifiuta una griglia vuota", () => {
    const result = checkSolution(1, [])!;
    expect(result).toEqual({ solved: false, reason: "empty", invalidClues: expect.any(Array) });
  });

  it("segnala solo gli indizi incompatibili", () => {
    const solution = getSolutionEdges(1)!;
    const raw = data.cases.find((c) => c.id === 1)!;
    const grid: Grid = { rows: raw.rows, cols: raw.cols };
    const broken = solution.slice(0, solution.length - 1);
    const result = checkSolution(1, broken)!;
    expect(result.solved).toBe(false);
    if (result.solved) return;
    const expectedInvalid = clueStatuses(grid, raw.clues, new Set(broken))
      .filter((s) => s.state !== "ok")
      .map((s) => cellKey([s.row, s.col]));
    expect(result.invalidClues.map(cellKey).sort()).toEqual(expectedInvalid.sort());
  });

  it("rifiuta un circuito valido ma diverso da quello del caso", () => {
    // un quadrato di una cella è un circuito legale ma non risolve il caso
    const grid: Grid = { rows: 5, cols: 5 };
    const square = regionEdgeIds(grid, [[0, 0]]);
    const result = checkSolution(1, square)!;
    expect(result.solved).toBe(false);
  });

  it("restituisce null per un caso inesistente", () => {
    expect(checkSolution(99, [])).toBeNull();
    expect(getPlayableCase(99)).toBeNull();
    expect(getReveal(99)).toBeNull();
  });
});

describe("suggerimenti", () => {
  it.each(CASE_IDS)("caso %i: il livello 1 non tocca la griglia", (id) => {
    const hint = getHint(id, 1, { lines: [], excluded: [] })!;
    expect(hint.kind).toBe("rule");
    expect(hint.lines).toEqual([]);
    expect(hint.excluded).toEqual([]);
    expect(hint.text.length).toBeGreaterThan(20);
  });

  it.each(CASE_IDS)("caso %i: il livello 2 rivela un bordo della soluzione", (id) => {
    const solution = getSolutionEdges(id)!;
    const hint = getHint(id, 2, { lines: [], excluded: [] })!;
    expect(hint.lines).toHaveLength(1);
    expect(solution).toContain(hint.lines[0]);
  });

  it("il livello 2 corregge prima un bordo sbagliato", () => {
    const solution = getSolutionEdges(1)!;
    const wrong = "r4c4-bottom";
    expect(solution).not.toContain(wrong);
    const hint = getHint(1, 2, { lines: [wrong], excluded: [] })!;
    expect(hint.excluded).toEqual([wrong]);
    expect(hint.lines).toEqual([]);
  });

  it.each(CASE_IDS)("caso %i: il livello 3 rivela da tre a cinque bordi", (id) => {
    const solution = getSolutionEdges(id)!;
    const hint = getHint(id, 3, { lines: [], excluded: [] })!;
    expect(hint.lines.length).toBeGreaterThanOrEqual(3);
    expect(hint.lines.length).toBeLessThanOrEqual(5);
    for (const edge of hint.lines) expect(solution).toContain(edge);
  });

  it("con il circuito già completo non rivela altro", () => {
    const solution = getSolutionEdges(1)!;
    const hint = getHint(1, 3, { lines: solution, excluded: [] })!;
    expect(hint.lines).toEqual([]);
    expect(hint.kind).toBe("rule");
  });

  it.each(CASE_IDS)("caso %i: applicando i suggerimenti si resta sulla soluzione", (id) => {
    const solution = getSolutionEdges(id)!;
    let lines: string[] = [];
    for (let step = 0; step < 4; step++) {
      const hint = getHint(id, 3, { lines, excluded: [] })!;
      lines = [...new Set([...lines, ...hint.lines])];
    }
    for (const edge of lines) expect(solution).toContain(edge);
  });
});
