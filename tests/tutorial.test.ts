import { describe, expect, it } from "vitest";

import { cellEdgeIds, cellKey, interiorCells, loopReport, regionEdgeIds } from "@/lib/slitherlink";
import { solve } from "@/lib/solver";
import { TUTORIAL_CLUES, TUTORIAL_GRID, TUTORIAL_REGION, TUTORIAL_THREE_CELL } from "@/lib/tutorial";

describe("griglia del tutorial", () => {
  const solution = regionEdgeIds(TUTORIAL_GRID, TUTORIAL_REGION);

  it("è un unico circuito chiuso", () => {
    expect(loopReport(TUTORIAL_GRID, new Set(solution)).isSingleLoop).toBe(true);
  });

  it("ha una sola soluzione", () => {
    const solutions = solve(TUTORIAL_GRID, TUTORIAL_CLUES, { limit: 3 });
    expect(solutions).toHaveLength(1);
    expect(solutions[0].map(cellKey).sort()).toEqual(TUTORIAL_REGION.map(cellKey).sort());
  });

  it("gli indizi corrispondono alla soluzione", () => {
    const active = new Set(solution);
    for (const [row, col, value] of TUTORIAL_CLUES) {
      expect(cellEdgeIds(row, col, TUTORIAL_GRID).filter((edge) => active.has(edge)).length).toBe(value);
    }
  });

  it("la stanza usata dal secondo passo ha davvero un 3", () => {
    const clue = TUTORIAL_CLUES.find(
      ([row, col]) => row === TUTORIAL_THREE_CELL[0] && col === TUTORIAL_THREE_CELL[1],
    );
    expect(clue?.[2]).toBe(3);
  });

  it("contiene un indizio 0, che il primo consiglio suggerisce di usare", () => {
    expect(TUTORIAL_CLUES.some(([, , value]) => value === 0)).toBe(true);
  });

  it("la zona buia risultante è la regione dichiarata", () => {
    expect(interiorCells(TUTORIAL_GRID, new Set(solution)).map(cellKey).sort()).toEqual(
      TUTORIAL_REGION.map(cellKey).sort(),
    );
  });
});
