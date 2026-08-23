import { describe, expect, it } from "vitest";

import {
  allEdgeIds,
  analyze,
  cellEdgeIds,
  cellSideId,
  clueStatuses,
  edgeId,
  interiorCells,
  loopReport,
  normalizeEdgeIds,
  parseEdgeId,
  regionEdgeIds,
  sameEdgeSet,
  type Clue,
  type Grid,
} from "@/lib/slitherlink";

const grid: Grid = { rows: 3, cols: 3 };

describe("identificatori dei bordi", () => {
  it("usa una forma canonica: top per gli orizzontali, left per i verticali", () => {
    expect(cellSideId(1, 1, "top", grid)).toBe("r1c1-top");
    expect(cellSideId(1, 1, "left", grid)).toBe("r1c1-left");
    // il lato destro di una cella è il lato sinistro della successiva
    expect(cellSideId(1, 1, "right", grid)).toBe("r1c2-left");
    expect(cellSideId(1, 1, "bottom", grid)).toBe("r2c1-top");
  });

  it("mantiene i bordi esterni sulle celle esistenti", () => {
    expect(cellSideId(2, 2, "bottom", grid)).toBe("r2c2-bottom");
    expect(cellSideId(2, 2, "right", grid)).toBe("r2c2-right");
  });

  it("interpreta tutti e quattro i lati", () => {
    expect(parseEdgeId("r0c0-right")).toEqual({ kind: "v", row: 0, col: 1 });
    expect(parseEdgeId("r0c0-bottom")).toEqual({ kind: "h", row: 1, col: 0 });
    expect(parseEdgeId("nonsense")).toBeNull();
  });

  it("conta tutti i bordi della griglia una volta sola", () => {
    const ids = allEdgeIds(grid);
    expect(new Set(ids).size).toBe(ids.length);
    // 2 * rows * cols + rows + cols
    expect(ids.length).toBe(2 * 3 * 3 + 3 + 3);
  });

  it("scarta id malformati o fuori griglia", () => {
    const ids = normalizeEdgeIds(["r0c0-top", "r0c0-top", "r9c9-top", "boom", "r0c0-right"], grid);
    // "r0c0-right" è lo stesso bordo di "r0c1-left"
    expect(ids).toEqual(["r0c0-top", "r0c1-left"]);
  });

  it("i quattro lati di una cella sono distinti", () => {
    expect(new Set(cellEdgeIds(1, 1, grid)).size).toBe(4);
  });
});

describe("regione e circuito", () => {
  const region: [number, number][] = [
    [0, 0],
    [0, 1],
    [1, 0],
  ];
  const solution = regionEdgeIds(grid, region);

  it("il confine di una regione è un circuito unico", () => {
    const report = loopReport(grid, new Set(solution));
    expect(report.isSingleLoop).toBe(true);
    expect(report.components).toBe(1);
    expect(report.badVertices).toEqual([]);
    expect(report.edgeCount).toBe(8);
  });

  it("ricalcola la regione dai bordi", () => {
    expect(interiorCells(grid, new Set(solution)).sort()).toEqual(region.sort());
  });

  it("riconosce una linea aperta", () => {
    const open = new Set(solution.slice(0, 3));
    expect(loopReport(grid, open).isSingleLoop).toBe(false);
    expect(loopReport(grid, open).badVertices.length).toBeGreaterThan(0);
  });

  it("riconosce due circuiti separati", () => {
    const twoLoops = new Set([
      ...regionEdgeIds(grid, [[0, 0]]),
      ...regionEdgeIds(grid, [[2, 2]]),
    ]);
    const report = loopReport(grid, twoLoops);
    expect(report.badVertices).toEqual([]);
    expect(report.components).toBe(2);
    expect(report.isSingleLoop).toBe(false);
  });

  it("riconosce una ramificazione", () => {
    const branch = new Set([...regionEdgeIds(grid, [[0, 0]]), "r0c1-top"]);
    const report = loopReport(grid, branch);
    expect(report.badVertices.length).toBeGreaterThan(0);
    expect(report.isSingleLoop).toBe(false);
  });

  it("valuta gli indizi rispetto ai bordi tracciati", () => {
    const clues: Clue[] = [
      [0, 1, 3],
      [1, 1, 2],
      [2, 2, 0],
    ];
    const statuses = clueStatuses(grid, clues, new Set(solution));
    expect(statuses.map((s) => s.state)).toEqual(["ok", "ok", "ok"]);

    const partial = analyze(grid, clues, new Set(solution.slice(0, 2)));
    expect(partial.isValid).toBe(false);
    expect(partial.invalidClues.length).toBeGreaterThan(0);
  });

  it("confronta insiemi di bordi indipendentemente dall'ordine", () => {
    expect(sameEdgeSet(solution, [...solution].reverse())).toBe(true);
    expect(sameEdgeSet(solution, solution.slice(1))).toBe(false);
  });

  it("l'id canonico non dipende dal lato usato per costruirlo", () => {
    expect(edgeId({ kind: "h", row: 1, col: 2 }, grid)).toBe(cellSideId(0, 2, "bottom", grid));
  });
});
