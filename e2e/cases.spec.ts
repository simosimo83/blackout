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
