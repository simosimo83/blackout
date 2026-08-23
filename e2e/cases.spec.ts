import { expect, test } from "@playwright/test";

import { caseById, drawEdges, objectName, seedProgress, solutionOf, suspectName } from "./helpers";

const IDS = [1, 2, 3, 4, 5, 6];

test.describe("i sei casi sono risolvibili", () => {
  for (const id of IDS) {
    test(`caso ${id}: si risolve e rivela sospettato e oggetto`, async ({ page }) => {
      const item = caseById(id);
      await seedProgress(page, id - 1);
      await page.goto(`/casi/${id}`);

      await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
      // niente spoiler nella pagina prima di risolvere
      const html = await page.content();
      expect(html).not.toContain(item.epilogue);
      expect(html).not.toContain("r0c0-top\",\"solution");

      await drawEdges(page, solutionOf(id));
      await page.getByRole("button", { name: /verifica la soluzione/i }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("Caso risolto");
      await expect(dialog).toContainText(suspectName(id));
      await expect(dialog).toContainText(objectName(id));
      await expect(dialog).toContainText(item.epilogue);
      // la zona buia viene evidenziata sulla planimetria
      await expect(page.locator(".board-cell.is-dark")).toHaveCount(item.region.length);

      // il risultato si può chiudere per guardare la planimetria e riaprire
      await dialog.getByRole("button", { name: /guarda la planimetria/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator(".board-cell.is-dark")).toHaveCount(item.region.length);
      await page.getByRole("button", { name: /mostra il risultato/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  }
});

test("una soluzione sbagliata non rivela il colpevole", async ({ page }) => {
  const item = caseById(1);
  await page.goto("/casi/1");
  const partial = solutionOf(1).slice(0, 4);
  await drawEdges(page, partial);
  await page.getByRole("button", { name: /verifica la soluzione/i }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".status-error")).toBeVisible();
  expect(await page.content()).not.toContain(item.epilogue);
  await expect(page.getByText("1 verifica errata")).toBeVisible();
});

test("un caso bloccato non è giocabile", async ({ page }) => {
  await page.goto("/casi/4");
  await expect(page.getByText("Caso bloccato")).toBeVisible();
  await expect(page.locator(".board-svg")).toHaveCount(0);
});

test("la planimetria resta leggibile e tutta in schermo", async ({ page }, testInfo) => {
  await seedProgress(page, 5); // il caso 6 è il più grande: 7x7
  await page.goto("/casi/6");
  const svg = page.locator(".board-svg");
  await expect(svg).toBeVisible();
  await expect(page.locator(".game-actions")).toBeVisible();
  await page.waitForTimeout(250); // attende l'assestamento dei font
  const box = (await svg.boundingBox())!;
  const viewport = page.viewportSize()!;

  // la planimetria occupa la larghezza utile senza uscire dallo schermo
  expect(box.width).toBeGreaterThan(viewport.width * 0.7);
  expect(box.width).toBeLessThanOrEqual(viewport.width);
  // una cella di 7x7 resta sopra i 34 px: bordi toccabili anche sui telefoni
  expect(box.height / 7).toBeGreaterThan(34);

  if (testInfo.project.name === "mobile") {
    // niente comandi coperti: la barra azioni sta sotto la planimetria
    const actions = (await page.locator(".game-actions").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(actions.y + 4);
    // e i due pulsanti principali stanno nel pollice, in fondo allo schermo
    expect(actions.y + actions.height).toBeLessThanOrEqual(viewport.height + 2);
  }
});

const PHONE_SIZES = [
  { width: 360, height: 640, nome: "telefono piccolo" },
  { width: 390, height: 844, nome: "telefono comune" },
  { width: 740, height: 360, nome: "telefono orizzontale" },
];

for (const size of PHONE_SIZES) {
  test(`${size.nome} ${size.width}x${size.height}: planimetria e azioni tutte in schermo`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "controllo dedicato ai telefoni");
    await page.setViewportSize({ width: size.width, height: size.height });
    await seedProgress(page, 5);
    await page.goto("/casi/6");
    await expect(page.locator(".board-svg")).toBeVisible();
    await expect(page.locator(".game-actions")).toBeVisible();
    await page.waitForTimeout(250);

    const board = (await page.locator(".board-svg").boundingBox())!;
    const actions = (await page.locator(".game-actions").boundingBox())!;

    // la planimetria resta grande abbastanza per essere toccata
    expect(board.height).toBeGreaterThan(150);
    // non finisce sotto la barra delle azioni
    expect(board.y + board.height).toBeLessThanOrEqual(actions.y + 4);
    // e la barra delle azioni è dentro lo schermo
    expect(actions.y + actions.height).toBeLessThanOrEqual(size.height + 2);
  });
}
