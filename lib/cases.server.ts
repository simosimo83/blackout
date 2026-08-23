import "server-only";

import fs from "node:fs";
import path from "node:path";

import { t } from "./i18n";
import {
  analyze,
  cellEdgeIds,
  edgeId,
  interiorCells,
  loopReport,
  normalizeEdgeIds,
  regionEdgeIds,
  sameEdgeSet,
  type Cell,
  type Clue,
  type EdgeId,
  type Grid,
} from "./slitherlink";
import type {
  CaseMeta,
  CaseReveal,
  CheckResult,
  Hint,
  HintLevel,
  PlayableCase,
  TokenObject,
  TokenSuspect,
} from "./types";

/**
 * Sorgente master dei casi. Il file viene letto dal filesystem (non importato)
 * così che soluzione, regione, colpevole ed epilogo non possano finire in
 * nessun bundle client.
 */
interface RawCase {
  id: number;
  title: string;
  location: string;
  difficulty: number;
  time: string;
  story: string;
  rows: number;
  cols: number;
  clues: Clue[];
  region: Cell[];
  suspects: [string, string, string][];
  objects: [string, string][];
  tokens: {
    suspects: Record<string, Cell>;
    objects: Record<string, Cell>;
  };
  answer: { suspect: string; object: string };
  epilogue: string;
}

interface RawData {
  title: string;
  cases: RawCase[];
  verification: { case: number; unique_solution: boolean; loop_edges: number; inside_cells: number; clue_count: number }[];
}

export const DATA_FILE = path.join(process.cwd(), "data", "blackout_6_casi_data.json");

let cached: RawData | null = null;

function loadData(): RawData {
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as RawData;
  }
  return cached;
}

function rawCase(id: number): RawCase | null {
  return loadData().cases.find((c) => c.id === id) ?? null;
}

function gridOf(c: RawCase): Grid {
  return { rows: c.rows, cols: c.cols };
}

function suspectTokens(c: RawCase): TokenSuspect[] {
  return c.suspects.map(([key, name, role]) => ({ key, name, role, cell: c.tokens.suspects[key] }));
}

function objectTokens(c: RawCase): TokenObject[] {
  return c.objects.map(([key, name]) => ({ key, name, cell: c.tokens.objects[key] }));
}

/** Metadati dei sei casi. */
export function getCaseMetas(): CaseMeta[] {
  return loadData().cases.map((c) => ({
    id: c.id,
    title: c.title,
    location: c.location,
    difficulty: c.difficulty,
    time: c.time,
    rows: c.rows,
    cols: c.cols,
  }));
}

/** Contenuto giocabile di un caso: senza soluzione, regione, answer ed epilogo. */
export function getPlayableCase(id: number): PlayableCase | null {
  const c = rawCase(id);
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    location: c.location,
    difficulty: c.difficulty,
    time: c.time,
    rows: c.rows,
    cols: c.cols,
    story: c.story,
    clues: c.clues,
    suspects: suspectTokens(c),
    objects: objectTokens(c),
    hintLevels: 3,
  };
}

/** Soluzione (lista di bordi canonici) di un caso. Solo lato server. */
export function getSolutionEdges(id: number): EdgeId[] | null {
  const c = rawCase(id);
  if (!c) return null;
  return regionEdgeIds(gridOf(c), c.region);
}

function buildReveal(c: RawCase): CaseReveal {
  const grid = gridOf(c);
  const solution = regionEdgeIds(grid, c.region);
  const suspect = suspectTokens(c).find((s) => s.key === c.answer.suspect)!;
  const object = objectTokens(c).find((o) => o.key === c.answer.object)!;
  // La regione dichiarata nel file e quella calcolata dal circuito devono
  // coincidere: se non fosse così il caso sarebbe incoerente.
  const computed = interiorCells(grid, new Set(solution));
  const region = computed.length ? computed : c.region;
  return { suspect, object, epilogue: c.epilogue, region, solution };
}

/** Rivelazione del caso: da usare solo dopo una verifica corretta. */
export function getReveal(id: number): CaseReveal | null {
  const c = rawCase(id);
  return c ? buildReveal(c) : null;
}

/**
 * Verifica i bordi inviati dal giocatore.
 * In caso di errore restituisce soltanto gli indizi incompatibili: mai
 * l'informazione su quali singoli bordi siano corretti.
 */
export function checkSolution(id: number, rawEdges: readonly string[]): CheckResult | null {
  const c = rawCase(id);
  if (!c) return null;
  const grid = gridOf(c);
  const edges = normalizeEdgeIds(rawEdges, grid);
  const active = new Set(edges);
  const solution = regionEdgeIds(grid, c.region);

  if (sameEdgeSet(edges, solution)) {
    return { solved: true, reveal: buildReveal(c) };
  }

  const { loop, invalidClues } = analyze(grid, c.clues, active);

  if (edges.length === 0) return { solved: false, reason: "empty", invalidClues };
  if (loop.badVertices.some((v) => vertexDegree(grid, active, v) > 2))
    return { solved: false, reason: "branching", invalidClues };
  if (loop.badVertices.length > 0) return { solved: false, reason: "open", invalidClues };
  if (loop.components > 1) return { solved: false, reason: "multipleLoops", invalidClues };
  if (invalidClues.length > 0) return { solved: false, reason: "clues", invalidClues };
  return { solved: false, reason: "wrongLoop", invalidClues };
}

function vertexDegree(grid: Grid, active: ReadonlySet<EdgeId>, [row, col]: Cell): number {
  let degree = 0;
  if (col > 0 && active.has(edgeId({ kind: "h", row, col: col - 1 }, grid))) degree++;
  if (col < grid.cols && active.has(edgeId({ kind: "h", row, col }, grid))) degree++;
  if (row > 0 && active.has(edgeId({ kind: "v", row: row - 1, col }, grid))) degree++;
  if (row < grid.rows && active.has(edgeId({ kind: "v", row, col }, grid))) degree++;
  return degree;
}

/* ------------------------------------------------------------------ */
/* Suggerimenti                                                        */
/* ------------------------------------------------------------------ */

interface HintState {
  lines: string[];
  excluded: string[];
}

/** Suggerimento del livello richiesto, calcolato sullo stato attuale. */
export function getHint(id: number, level: HintLevel, state: HintState): Hint | null {
  const c = rawCase(id);
  if (!c) return null;
  const grid = gridOf(c);
  const lines = new Set(normalizeEdgeIds(state.lines ?? [], grid));
  const excluded = new Set(normalizeEdgeIds(state.excluded ?? [], grid));
  const solution = new Set(regionEdgeIds(grid, c.region));

  if (level === 1) return ruleHint(c, grid, lines);
  if (level === 2) return stepHint(c, grid, lines, excluded, solution);
  return unlockHint(grid, lines, solution);
}

function hint(level: HintLevel, kind: Hint["kind"], text: string, lines: EdgeId[] = [], excluded: EdgeId[] = []): Hint {
  return { level, kind, title: t.hints.titles[level], text, lines, excluded };
}

/** Livello 1: consiglio di ragionamento, nessun bordo toccato. */
function ruleHint(c: RawCase, grid: Grid, lines: ReadonlySet<EdgeId>): Hint {
  const rules = t.hints.rules;
  const report = loopReport(grid, lines);
  const hasBranch = report.badVertices.some((v) => vertexDegree(grid, lines, v) > 2);
  if (hasBranch) return hint(1, "rule", rules.branching);
  if (report.badVertices.length > 0) return hint(1, "rule", rules.deadEnd);

  const over = c.clues.some(
    ([r, col, value]) => cellEdgeIds(r, col, grid).filter((e) => lines.has(e)).length > value,
  );
  if (over) return hint(1, "rule", rules.over);

  const isCorner = (r: number, col: number) =>
    (r === 0 || r === grid.rows - 1) && (col === 0 || col === grid.cols - 1);
  const clueAt = new Map(c.clues.map(([r, col, value]) => [`${r},${col}`, value]));

  if (c.clues.some(([r, col, value]) => value === 3 && isCorner(r, col))) return hint(1, "rule", rules.cornerThree);
  if (c.clues.some(([r, col, value]) => value === 1 && isCorner(r, col))) return hint(1, "rule", rules.cornerOne);
  if (c.clues.some(([, , value]) => value === 0)) return hint(1, "rule", rules.zero);
  if (
    c.clues.some(
      ([r, col, value]) =>
        value === 3 && (clueAt.get(`${r},${col + 1}`) === 3 || clueAt.get(`${r + 1},${col}`) === 3),
    )
  )
    return hint(1, "rule", rules.threeAdjacent);
  if (c.clues.some(([, , value]) => value === 3)) return hint(1, "rule", rules.three);
  if (c.clues.some(([, , value]) => value === 2)) return hint(1, "rule", rules.two);
  if (lines.size === 0) return hint(1, "rule", rules.corridor);
  return hint(1, "rule", rules.generic);
}

/**
 * Livello 2: un passaggio certo.
 * Prima corregge un bordo sbagliato, altrimenti rivela un bordo della soluzione
 * (preferendo quelli attaccati al lavoro già fatto) oppure un'esclusione certa.
 */
function stepHint(
  c: RawCase,
  grid: Grid,
  lines: ReadonlySet<EdgeId>,
  excluded: ReadonlySet<EdgeId>,
  solution: ReadonlySet<EdgeId>,
): Hint {
  const wrong = [...lines].filter((e) => !solution.has(e)).sort();
  if (wrong.length > 0) return hint(2, "edges", t.hints.fixWrong, [], [wrong[0]]);

  const missing = [...solution].filter((e) => !lines.has(e)).sort();
  if (missing.length === 0) return hint(2, "rule", t.hints.nothingLeft);

  const touching = missing.filter((e) => touchesActive(grid, e, lines));
  const pick = (touching.length > 0 ? touching : missing)[0];
  return hint(2, "edges", t.hints.revealLine, [pick]);
}

/** Livello 3: da tre a cinque bordi della soluzione. */
function unlockHint(grid: Grid, lines: ReadonlySet<EdgeId>, solution: ReadonlySet<EdgeId>): Hint {
  const missing = [...solution].filter((e) => !lines.has(e)).sort();
  if (missing.length === 0) return hint(3, "rule", t.hints.nothingLeft);
  const wanted = Math.min(5, Math.max(3, Math.ceil(missing.length / 4)));
  const picked: EdgeId[] = [];
  const chain = new Set(lines);
  while (picked.length < wanted && picked.length < missing.length) {
    const next =
      missing.find((e) => !picked.includes(e) && touchesActive(grid, e, chain)) ??
      missing.find((e) => !picked.includes(e));
    if (!next) break;
    picked.push(next);
    chain.add(next);
  }
  return hint(3, "edges", t.hints.unlock(picked.length), picked);
}

/** true se il bordo condivide un vertice con un bordo già acceso. */
function touchesActive(grid: Grid, id: EdgeId, active: ReadonlySet<EdgeId>): boolean {
  if (active.size === 0) return false;
  const vertices = endpointsOf(id);
  for (const [row, col] of vertices) {
    if (vertexDegree(grid, active, [row, col]) > 0) return true;
  }
  return false;
}

function endpointsOf(id: EdgeId): Cell[] {
  const m = /^r(\d+)c(\d+)-(top|right|bottom|left)$/.exec(id);
  if (!m) return [];
  const row = Number(m[1]);
  const col = Number(m[2]);
  switch (m[3]) {
    case "top":
      return [
        [row, col],
        [row, col + 1],
      ];
    case "bottom":
      return [
        [row + 1, col],
        [row + 1, col + 1],
      ];
    case "left":
      return [
        [row, col],
        [row + 1, col],
      ];
    default:
      return [
        [row, col + 1],
        [row + 1, col + 1],
      ];
  }
}
