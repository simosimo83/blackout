import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

import { parseEdgeId, regionEdgeIds, type Cell, type Clue, type EdgeId } from "../lib/slitherlink";

/** Stessa geometria usata da GridBoard. */
const CELL = 100;
const PAD = 46;

export interface CaseFixture {
  id: number;
  title: string;
  rows: number;
  cols: number;
  clues: Clue[];
  region: Cell[];
  suspects: [string, string, string][];
  objects: [string, string][];
  answer: { suspect: string; object: string };
  epilogue: string;
}

const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "blackout_6_casi_data.json"), "utf8"),
) as { cases: CaseFixture[] };

export const CASES = raw.cases;

export function caseById(id: number): CaseFixture {
  const found = CASES.find((item) => item.id === id);
  if (!found) throw new Error(`caso ${id} assente dal file dati`);
  return found;
}

export function solutionOf(id: number): EdgeId[] {
  const item = caseById(id);
  return regionEdgeIds({ rows: item.rows, cols: item.cols }, item.region);
}

export function suspectName(id: number): string {
  const item = caseById(id);
  return item.suspects.find(([key]) => key === item.answer.suspect)![1];
}

export function objectName(id: number): string {
  const item = caseById(id);
  return item.objects.find(([key]) => key === item.answer.object)![1];
}

/** Progressi finti: i casi precedenti risultano completati. */
export async function seedProgress(page: Page, completedUpTo: number, anonId = "e2e-anon"): Promise<void> {
  const cases: Record<string, unknown> = {};
  for (let id = 1; id <= completedUpTo; id++) {
    cases[String(id)] = {
      started: true,
      completed: true,
      lines: [],
      excluded: [],
      elapsedMs: 60_000,
      wrongChecks: 0,
      hintsUsed: 0,
      bestTimeMs: 60_000,
      bestHints: 0,
      bestWrongChecks: 0,
      lastPlayedAt: 1,
      firstInteraction: true,
    };
  }
  const progress = {
    version: 1,
    anonId,
    createdAt: 1,
    lastSessionAt: 1,
    sessions: 1,
    tutorialCompleted: true,
    waitlistSubmitted: false,
    waitlistPrompted: false,
    cases,
  };
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ["blackout.progress.v1", JSON.stringify(progress)] as const,
  );
}

/** Punto (in pixel di pagina) al centro di un bordo della planimetria. */
export async function edgePoint(page: Page, edge: EdgeId): Promise<{ x: number; y: number }> {
  const ref = parseEdgeId(edge);
  if (!ref) throw new Error(`bordo non valido: ${edge}`);
  const svg = page.locator(".board-svg");
  const box = await svg.boundingBox();
  if (!box) throw new Error("planimetria non visibile");
  const viewBox = await svg.getAttribute("viewBox");
  const [, , width, height] = viewBox!.split(" ").map(Number);
  const scale = Math.min(box.width / width, box.height / height);
  const offsetX = (box.width - width * scale) / 2;
  const offsetY = (box.height - height * scale) / 2;

  const local =
    ref.kind === "h"
      ? { x: PAD + ref.col * CELL + CELL / 2, y: PAD + ref.row * CELL }
      : { x: PAD + ref.col * CELL, y: PAD + ref.row * CELL + CELL / 2 };

  return {
    x: box.x + offsetX + local.x * scale,
    y: box.y + offsetY + local.y * scale,
  };
}

/** Traccia i bordi indicati toccandoli uno a uno, scorrendo se serve. */
export async function drawEdges(page: Page, edges: EdgeId[]): Promise<void> {
  const viewport = page.viewportSize();
  const height = viewport?.height ?? 720;
  for (const edge of edges) {
    let point = await edgePoint(page, edge);
    // la toolbar è sticky in alto: si tiene il bersaglio lontano dai bordi
    if (point.y < 150 || point.y > height - 60) {
      await page.evaluate((dy) => window.scrollBy(0, dy), Math.round(point.y - height / 2));
      point = await edgePoint(page, edge);
    }
    await page.mouse.click(point.x, point.y);
  }
}

/**
 * Eventi analytics arrivati al server per un dato ID anonimo.
 * Lo store su file è quello configurato in playwright.config.ts.
 */
export function storedEvents(anonId: string): { name: string; props: Record<string, unknown> }[] {
  const file = path.join(process.cwd(), ".data", "e2e", "analytics.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { name: string; anonId?: string; props: Record<string, unknown> })
    .filter((row) => row.anonId === anonId);
}

/** Numero di bordi accesi attualmente disegnati. */
export async function drawnEdges(page: Page): Promise<number> {
  return page.locator(".board-line").count();
}
