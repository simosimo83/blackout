import { expect, test } from "@playwright/test";

import { drawEdges, seedProgress, solutionOf, storedEvents } from "./helpers";

/**
 * Gli eventi vengono verificati dove contano davvero: nello store del server,
 * dopo essere passati da /api/analytics. Ogni test usa un ID anonimo diverso
 * per non mescolarsi agli altri.
 */
async function waitForEvents(anonId: string, expected: string[]) {
  await expect
    .poll(() => storedEvents(anonId).map((event) => event.name), { timeout: 15_000, message: `eventi attesi: ${expected.join(", ")}` })
    .toEqual(expect.arrayContaining(expected));
  return storedEvents(anonId);
}

test("la sessione di gioco invia tutti gli eventi previsti", async ({ page }, testInfo) => {
  const anonId = `analytics-gioco-${testInfo.project.name}`;
  await seedProgress(page, 1, anonId); // il caso 2 è già sbloccato: si arriva a next_case_click

  await page.goto("/");
  await page.getByRole("link", { name: /gioca il primo caso|riprendi/i }).first().click();
  await expect(page).toHaveURL(/\/casi\/\d$/);

  await drawEdges(page, solutionOf(2).slice(0, 2));
  await page.getByRole("button", { name: /suggerimento \(1\/3\)/i }).click();
  await expect(page.locator(".hint-box")).toBeVisible();

  await page.getByRole("button", { name: /verifica la soluzione/i }).click();
  await expect(page.locator(".status-error")).toBeVisible();

  // i due bordi iniziali sono già accesi: si completa il resto del circuito
  await drawEdges(page, solutionOf(2).slice(2));
  await page.getByRole("button", { name: /verifica la soluzione/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /condividi il risultato/i }).click();
  await dialog.getByRole("button", { name: /gioca il prossimo caso/i }).click();
  await expect(page).toHaveURL(/\/casi\/3$/);

  const events = await waitForEvents(anonId, [
    "landing_view",
    "play_cta_click",
    "case_start",
    "first_interaction",
    "hint_used",
    "check_attempt",
    "case_complete",
    "share_result",
    "next_case_click",
    "email_capture_view",
  ]);

  // proprietà comuni e specifiche del caso
  const complete = events.find((event) => event.name === "case_complete")!;
  expect(complete.props).toMatchObject({ game: "blackout", case_id: 2, difficulty: 2 });
  expect(typeof complete.props.duration_seconds).toBe("number");
  expect(complete.props.wrong_checks).toBe(1);
  expect(complete.props.hints_used).toBe(1);
  expect(["mobile", "tablet", "desktop"]).toContain(complete.props.device_type);
  expect(complete.props).toHaveProperty("utm_source");
  expect(complete.props).toHaveProperty("utm_campaign");
  expect(complete.props).toHaveProperty("referrer");
  expect(["new", "returning"]).toContain(complete.props.new_or_returning);

  const hint = events.find((event) => event.name === "hint_used")!;
  expect(hint.props.hint_level).toBe(1);
});

test("tutorial ed email inviano i propri eventi, con utm e referrer", async ({ page }, testInfo) => {
  const anonId = `analytics-tutorial-${testInfo.project.name}`;
  await seedProgress(page, 0, anonId);

  await page.goto("/?utm_source=test&utm_campaign=lancio");
  await page.goto("/tutorial");
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

  await page.goto("/");
  const form = page.locator("form.waitlist");
  await form.getByPlaceholder("la-tua@email.it").fill("analytics@esempio.it");
  await form.getByPlaceholder("la-tua@email.it").press("Enter");
  await expect(page.locator(".waitlist-done")).toBeVisible();

  const events = await waitForEvents(anonId, [
    "tutorial_start",
    "tutorial_complete",
    "email_capture_view",
    "email_submitted",
  ]);

  const submitted = events.find((event) => event.name === "email_submitted")!;
  expect(submitted.props).toMatchObject({ game: "blackout", utm_source: "test", utm_campaign: "lancio" });
});
