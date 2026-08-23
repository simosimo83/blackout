import { expect, test } from "@playwright/test";

import { drawEdges, drawnEdges, seedProgress, solutionOf } from "./helpers";

test("dalla homepage si arriva al primo caso senza registrarsi", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BLACKOUT", level: 1 })).toBeVisible();
  await expect(page.getByText("Una sola linea rivela il ladro.").first()).toBeVisible();

  await page.getByRole("link", { name: /gioca il primo caso/i }).first().click();
  await expect(page).toHaveURL(/\/casi\/1$/);
  await expect(page.getByRole("heading", { name: "La sala delle gemme" })).toBeVisible();
  await expect(page.locator(".board-svg")).toBeVisible();
});

test("il tutorial si completa e porta al primo caso", async ({ page }) => {
  await page.goto("/tutorial");
  await expect(page.getByText("Passo 1 di 4")).toBeVisible();

  // il tutorial usa una griglia dimostrativa 3x3, non uno dei sei casi
  await drawEdges(page, [
    "r0c0-top",
    "r0c1-top",
    "r0c2-left",
    "r1c1-top",
    "r1c1-left",
    "r2c0-top",
    "r0c0-left",
    "r1c0-left",
  ]);
  await expect(page.locator(".tutorial-done")).toBeVisible();

  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("link", { name: /gioca il primo caso/i }).click();
  await expect(page).toHaveURL(/\/casi\/1$/);
});

test("progressi e timer sopravvivono al refresh", async ({ page }) => {
  await page.goto("/casi/1");
  await drawEdges(page, solutionOf(1).slice(0, 3));
  await expect(page.locator(".board-line")).toHaveCount(3);
  await expect(page.locator(".timer-value")).not.toHaveText("00:00");

  await page.waitForTimeout(1200); // lascia scrivere il salvataggio (debounce 400ms)
  const timeBefore = await page.locator(".timer-value").textContent();

  await page.reload();
  await expect(page.locator(".board-line")).toHaveCount(3);
  expect(await drawnEdges(page)).toBe(3);
  await expect(page.locator(".timer-value")).not.toHaveText("00:00");
  expect(await page.locator(".timer-value").textContent()).not.toBe("00:00");
  expect(timeBefore).not.toBe("00:00");
});

test("i suggerimenti sono tre e vengono applicati alla planimetria", async ({ page }) => {
  await page.goto("/casi/1");
  const hintButton = page.getByRole("button", { name: /suggerimento \(1\/3\)/i });
  await hintButton.click();
  await expect(page.locator(".hint-box")).toBeVisible();
  await expect(page.locator(".hint-box")).toContainText("Regola logica");
  await expect(page.locator(".board-line")).toHaveCount(0);

  await page.getByRole("button", { name: /suggerimento \(2\/3\)/i }).click();
  await expect(page.locator(".board-line")).toHaveCount(1);

  await page.getByRole("button", { name: /suggerimento \(3\/3\)/i }).click();
  expect(await drawnEdges(page)).toBeGreaterThanOrEqual(4);
  await expect(page.getByText("3 suggerimenti")).toBeVisible();
});

test("l'archivio mostra stato e sblocchi", async ({ page }) => {
  await seedProgress(page, 2);
  await page.goto("/casi");
  await expect(page.locator(".case-card")).toHaveCount(6);
  await expect(page.locator(".case-card").nth(0).getByText("Completato")).toBeVisible();
  await expect(page.locator(".case-card").nth(2).getByText("Da iniziare")).toBeVisible();
  await expect(page.locator(".case-card").nth(3)).toHaveClass(/is-locked/);
  await expect(page.locator(".case-card").nth(0).getByText("01:00")).toBeVisible();
});

test("la lista d'attesa accetta un'email", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("form.waitlist");
  const field = form.getByPlaceholder("la-tua@email.it");
  await field.fill("e2e@esempio.it");
  await expect(form.getByRole("button", { name: "Avvisami" })).toBeVisible();
  await field.press("Enter");
  await expect(page.locator(".waitlist-done")).toContainText("Ti avviseremo");
});

test("un'email non valida non viene inviata", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("form.waitlist");
  await form.getByPlaceholder("la-tua@email.it").fill("non-una-email");
  await form.getByPlaceholder("la-tua@email.it").press("Enter");
  await expect(page.getByText("Controlla l'indirizzo email.")).toBeVisible();
  await expect(page.locator(".waitlist-done")).toHaveCount(0);
});

test("dopo il secondo caso viene proposta l'email, senza obbligo", async ({ page }) => {
  await seedProgress(page, 1);
  await page.goto("/casi/2");
  await drawEdges(page, solutionOf(2));
  await page.getByRole("button", { name: /verifica la soluzione/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Vuoi i prossimi casi?");
  // la proposta non blocca il proseguimento
  await expect(dialog.getByRole("button", { name: /gioca il prossimo caso/i })).toBeEnabled();
});

test("il risultato si può condividere senza spoiler", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions solo su chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/casi/1");
  await drawEdges(page, solutionOf(1));
  await page.getByRole("button", { name: /verifica la soluzione/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("button", { name: /condividi il risultato/i }).click();
  // la scrittura negli appunti è asincrona
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 10_000 })
    .toContain("BLACKOUT #1");
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("Risolto in");
  expect(clipboard).not.toContain("Marco Valli");
  expect(clipboard).not.toContain("r0c0");
});
