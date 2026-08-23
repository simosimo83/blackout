/**
 * Risolutore di riferimento, usato dai test per dimostrare che ogni caso ha
 * una sola soluzione. Non viene usato dal gioco a runtime.
 *
 * Una soluzione di slitherlink equivale a una colorazione dentro/fuori delle
 * celle i cui bordi di confine formano un unico circuito. Enumeriamo le
 * colorazioni cella per cella potando appena un indizio diventa impossibile o
 * si crea un vertice a quattro bordi (incrocio).
 */
import { loopReport, regionEdgeIds, type Cell, type Clue, type Grid } from "./slitherlink";

const INSIDE = 1;
const OUTSIDE = 0;
const UNSET = -1;

export interface SolveOptions {
  /** Massimo numero di soluzioni da raccogliere (default 2: basta per l'unicità). */
  limit?: number;
}

/** Tutte le regioni (fino a `limit`) compatibili con gli indizi. */
export function solve(grid: Grid, clues: readonly Clue[], options: SolveOptions = {}): Cell[][] {
  const limit = options.limit ?? 2;
  const { rows, cols } = grid;
  const total = rows * cols;
  const color = new Int8Array(total).fill(UNSET);
  const clueMap = new Map<string, number>(clues.map(([r, c, v]) => [`${r},${c}`, v]));
  const solutions: Cell[][] = [];

  const index = (r: number, c: number) => r * cols + c;
  const colorAt = (r: number, c: number) => (r < 0 || c < 0 || r >= rows || c >= cols ? OUTSIDE : color[index(r, c)]);

  /** Un indizio è ancora soddisfacibile? `complete` esige il valore esatto. */
  function clueOk(r: number, c: number, complete: boolean): boolean {
    const want = clueMap.get(`${r},${c}`);
    if (want === undefined) return true;
    const me = colorAt(r, c);
    if (me === UNSET) return true;
    let sure = 0;
    let unknown = 0;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const value = colorAt(r + dr, c + dc);
      if (value === UNSET) unknown++;
      else if (value !== me) sure++;
    }
    if (sure > want) return false;
    if (sure + unknown < want) return false;
    if (complete && sure !== want) return false;
    return true;
  }

  /** Vertice (r,c) con celle in diagonale uguali fra loro: sarebbe un incrocio. */
  function crossing(r: number, c: number): boolean {
    const a = colorAt(r - 1, c - 1);
    const b = colorAt(r - 1, c);
    const d = colorAt(r, c - 1);
    const e = colorAt(r, c);
    if (a === UNSET || b === UNSET || d === UNSET || e === UNSET) return false;
    return a === e && b === d && a !== b;
  }

  function collect(): Cell[] {
    const region: Cell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if (color[index(r, c)] === INSIDE) region.push([r, c]);
    return region;
  }

  function dfs(i: number): void {
    if (solutions.length >= limit) return;
    if (i === total) {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!clueOk(r, c, true)) return;
      const region = collect();
      if (region.length === 0) return;
      const edges = regionEdgeIds(grid, region);
      if (!loopReport(grid, new Set(edges)).isSingleLoop) return;
      solutions.push(region);
      return;
    }
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const value of [OUTSIDE, INSIDE]) {
      color[i] = value;
      const ok =
        clueOk(r, c, false) &&
        (r === 0 || clueOk(r - 1, c, c === cols - 1)) &&
        (r === 0 || c === 0 || clueOk(r - 1, c - 1, true)) &&
        (c === 0 || clueOk(r, c - 1, false)) &&
        !crossing(r, c);
      if (ok) dfs(i + 1);
      color[i] = UNSET;
    }
  }

  dfs(0);
  return solutions;
}

/** true se gli indizi ammettono una sola soluzione. */
export function hasUniqueSolution(grid: Grid, clues: readonly Clue[]): boolean {
  return solve(grid, clues, { limit: 2 }).length === 1;
}
