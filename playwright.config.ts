import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
/** Con E2E_BASE_URL i test girano su un'istanza già in esecuzione (es. Railway). */
const remote = process.env.E2E_BASE_URL;
const baseURL = remote ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    // In ambienti dove i browser di Playwright sono preinstallati fuori dalla
    // cache di default, indicare l'eseguibile con CHROMIUM_PATH.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    // Utile quando i test girano su un'istanza remota dietro a un proxy.
    proxy: process.env.E2E_PROXY ? { server: process.env.E2E_PROXY } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: `npm run build && npm run start -- --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: { BLACKOUT_DATA_DIR: ".data/e2e" },
      },
});
