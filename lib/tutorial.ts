import type { Cell, Clue, Grid } from "./slitherlink";

/**
 * Griglia dimostrativa del tutorial: volutamente separata dai sei casi reali,
 * così che nessuno spoiler passi dal tutorial al gioco.
 */
export const TUTORIAL_GRID: Grid = { rows: 3, cols: 3 };

export const TUTORIAL_CLUES: Clue[] = [
  [0, 1, 3],
  [1, 0, 3],
  [1, 1, 2],
  [1, 2, 0],
  [2, 2, 0],
];

/** Zona buia del tutorial (a L in alto a sinistra). */
export const TUTORIAL_REGION: Cell[] = [
  [0, 0],
  [0, 1],
  [1, 0],
];

/** Stanza con il 3 usata dal secondo passo del tutorial. */
export const TUTORIAL_THREE_CELL: Cell = [0, 1];
