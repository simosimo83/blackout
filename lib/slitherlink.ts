/**
 * Logica pura del circuito (slitherlink) usata da client, server e test.
 * Nessuna dipendenza da React o da Next: puo' girare ovunque.
 *
 * Sistema di coordinate: [row, col] zero-based, origine in alto a sinistra.
 *
 * Modello dei bordi:
 *  - bordo orizzontale `h` di indice (row, col): segmento fra i vertici
 *    (row, col) e (row, col + 1). row in [0..rows], col in [0..cols-1].
 *  - bordo verticale `v` di indice (row, col): segmento fra i vertici
 *    (row, col) e (row + 1, col). row in [0..rows-1], col in [0..cols].
 */

export type EdgeKind = "h" | "v";

export interface EdgeRef {
  kind: EdgeKind;
  row: number;
  col: number;
}

export interface Grid {
  rows: number;
  cols: number;
}

/** Indizio numerico: [riga, colonna, numero di lati sul circuito]. */
export type Clue = [number, number, number];

/** Coordinate di una cella. */
export type Cell = [number, number];

export type EdgeSide = "top" | "right" | "bottom" | "left";

export type EdgeId = string; // es. "r2c3-top", "r2c3-right"

const ID_RE = /^r(\d+)c(\d+)-(top|right|bottom|left)$/;

/** Bordo (kind/row/col) a partire da cella + lato. */
export function edgeFromCellSide(row: number, col: number, side: EdgeSide): EdgeRef {
  switch (side) {
    case "top":
      return { kind: "h", row, col };
    case "bottom":
      return { kind: "h", row: row + 1, col };
    case "left":
      return { kind: "v", row, col };
    case "right":
      return { kind: "v", row, col: col + 1 };
  }
}

/** Interpreta un id testuale (accetta tutti e quattro i lati). */
export function parseEdgeId(id: string): EdgeRef | null {
  const m = ID_RE.exec(id);
  if (!m) return null;
  const row = Number(m[1]);
  const col = Number(m[2]);
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) return null;
  return edgeFromCellSide(row, col, m[3] as EdgeSide);
}

/** Forma canonica dell'id: `top` per gli orizzontali, `left` per i verticali. */
export function edgeId(edge: EdgeRef, grid: Grid): EdgeId {
  if (edge.kind === "h") {
    if (edge.row < grid.rows) return `r${edge.row}c${edge.col}-top`;
    return `r${grid.rows - 1}c${edge.col}-bottom`;
  }
  if (edge.col < grid.cols) return `r${edge.row}c${edge.col}-left`;
  return `r${edge.row}c${grid.cols - 1}-right`;
}

export function cellSideId(row: number, col: number, side: EdgeSide, grid: Grid): EdgeId {
  return edgeId(edgeFromCellSide(row, col, side), grid);
}

export function isEdgeInGrid(edge: EdgeRef, grid: Grid): boolean {
  if (edge.row < 0 || edge.col < 0) return false;
  if (edge.kind === "h") return edge.row <= grid.rows && edge.col < grid.cols;
  return edge.row < grid.rows && edge.col <= grid.cols;
}

/** Tutti i bordi della griglia, in ordine deterministico. */
export function allEdges(grid: Grid): EdgeRef[] {
  const out: EdgeRef[] = [];
  for (let row = 0; row <= grid.rows; row++)
    for (let col = 0; col < grid.cols; col++) out.push({ kind: "h", row, col });
  for (let row = 0; row < grid.rows; row++)
    for (let col = 0; col <= grid.cols; col++) out.push({ kind: "v", row, col });
  return out;
}

export function allEdgeIds(grid: Grid): EdgeId[] {
  return allEdges(grid).map((e) => edgeId(e, grid));
}

/** I quattro id dei lati di una cella, in ordine top/right/bottom/left. */
export function cellEdgeIds(row: number, col: number, grid: Grid): EdgeId[] {
  return (["top", "right", "bottom", "left"] as EdgeSide[]).map((s) => cellSideId(row, col, s, grid));
}

/**
 * Normalizza una lista di id arbitrari: scarta i duplicati, gli id malformati e
 * quelli fuori griglia. Restituisce id canonici ordinati.
 */
export function normalizeEdgeIds(ids: readonly string[], grid: Grid): EdgeId[] {
  const set = new Set<EdgeId>();
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const ref = parseEdgeId(raw.trim());
    if (!ref || !isEdgeInGrid(ref, grid)) continue;
    set.add(edgeId(ref, grid));
  }
  return [...set].sort();
}

/** Bordi di confine di una regione di celle: e' la soluzione del caso. */
export function regionEdgeIds(grid: Grid, region: readonly Cell[]): EdgeId[] {
  const inside = new Set(region.map(([r, c]) => `${r},${c}`));
  const isIn = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < grid.rows && c < grid.cols && inside.has(`${r},${c}`);
  const out: EdgeId[] = [];
  for (let row = 0; row <= grid.rows; row++)
    for (let col = 0; col < grid.cols; col++)
      if (isIn(row - 1, col) !== isIn(row, col)) out.push(edgeId({ kind: "h", row, col }, grid));
  for (let row = 0; row < grid.rows; row++)
    for (let col = 0; col <= grid.cols; col++)
      if (isIn(row, col - 1) !== isIn(row, col)) out.push(edgeId({ kind: "v", row, col }, grid));
  return out.sort();
}

export type ClueState = "under" | "ok" | "over";

export interface ClueStatus {
  row: number;
  col: number;
  value: number;
  active: number;
  state: ClueState;
}

/** Stato di ogni indizio rispetto ai bordi tracciati. */
export function clueStatuses(grid: Grid, clues: readonly Clue[], active: ReadonlySet<EdgeId>): ClueStatus[] {
  return clues.map(([row, col, value]) => {
    const count = cellEdgeIds(row, col, grid).filter((id) => active.has(id)).length;
    return {
      row,
      col,
      value,
      active: count,
      state: count === value ? "ok" : count > value ? "over" : "under",
    };
  });
}

export interface LoopReport {
  /** Numero di bordi tracciati. */
  edgeCount: number;
  /** Vertici con grado diverso da 0 o 2 (incroci o ramificazioni). */
  badVertices: Cell[];
  /** Numero di componenti connesse dei bordi tracciati. */
  components: number;
  /** true se i bordi formano un unico circuito chiuso non vuoto. */
  isSingleLoop: boolean;
}

/** Analisi strutturale dei bordi tracciati (indipendente dagli indizi). */
export function loopReport(grid: Grid, active: ReadonlySet<EdgeId>): LoopReport {
  const edges = [...active].map((id) => parseEdgeId(id)).filter((e): e is EdgeRef => e !== null);
  const vertexKey = (r: number, c: number) => `${r},${c}`;
  const endpoints = (e: EdgeRef): [string, string] =>
    e.kind === "h"
      ? [vertexKey(e.row, e.col), vertexKey(e.row, e.col + 1)]
      : [vertexKey(e.row, e.col), vertexKey(e.row + 1, e.col)];

  const degree = new Map<string, number>();
  const adjacency = new Map<string, number[]>();
  edges.forEach((e, i) => {
    for (const v of endpoints(e)) {
      degree.set(v, (degree.get(v) ?? 0) + 1);
      const list = adjacency.get(v);
      if (list) list.push(i);
      else adjacency.set(v, [i]);
    }
  });

  const badVertices: Cell[] = [];
  for (const [v, d] of degree) {
    if (d !== 2) {
      const [r, c] = v.split(",").map(Number);
      badVertices.push([r, c]);
    }
  }
  badVertices.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // componenti connesse
  let components = 0;
  const seen = new Array<boolean>(edges.length).fill(false);
  for (let i = 0; i < edges.length; i++) {
    if (seen[i]) continue;
    components++;
    const stack = [i];
    seen[i] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      for (const v of endpoints(edges[cur])) {
        for (const next of adjacency.get(v) ?? []) {
          if (!seen[next]) {
            seen[next] = true;
            stack.push(next);
          }
        }
      }
    }
  }

  return {
    edgeCount: edges.length,
    badVertices,
    components,
    isSingleLoop: edges.length > 0 && badVertices.length === 0 && components === 1,
  };
}

/**
 * Celle interne al circuito (regola pari/dispari sui bordi verticali).
 * Ha senso solo se `active` forma un circuito valido.
 */
export function interiorCells(grid: Grid, active: ReadonlySet<EdgeId>): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < grid.rows; row++) {
    let inside = false;
    for (let col = 0; col < grid.cols; col++) {
      if (active.has(edgeId({ kind: "v", row, col }, grid))) inside = !inside;
      if (inside) cells.push([row, col]);
    }
  }
  return cells;
}

export interface SolutionAnalysis {
  loop: LoopReport;
  clues: ClueStatus[];
  /** Indizi attualmente non compatibili con i bordi tracciati. */
  invalidClues: Cell[];
  /** true se tutti gli indizi tornano e i bordi formano un unico circuito. */
  isValid: boolean;
}

export function analyze(grid: Grid, clues: readonly Clue[], active: ReadonlySet<EdgeId>): SolutionAnalysis {
  const loop = loopReport(grid, active);
  const statuses = clueStatuses(grid, clues, active);
  const invalidClues = statuses.filter((s) => s.state !== "ok").map((s): Cell => [s.row, s.col]);
  return { loop, clues: statuses, invalidClues, isValid: loop.isSingleLoop && invalidClues.length === 0 };
}

/** Confronto insiemistico fra due liste di bordi. */
export function sameEdgeSet(a: readonly EdgeId[], b: readonly EdgeId[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export function cellKey([r, c]: Cell): string {
  return `${r},${c}`;
}
