import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { APP_ORIGIN, DEFAULT_SETTINGS } from "../helpers/defaults.mjs";
import { launchBrowser, newPage } from "../helpers/browser.mjs";
import {
  installTauriMock,
  readMockSettings,
  readMockUpdates,
} from "../helpers/tauri-mock.mjs";

async function clickCheckboxByLabel(page, labelText) {
  const clicked = await page.evaluate((text) => {
    const labels = [...document.querySelectorAll("label.setting-item")];
    const label = labels.find((l) => l.textContent?.includes(text));
    const input = label?.querySelector('input[type="checkbox"]');
    if (!input) return false;
    input.click();
    return true;
  }, labelText);
  assert.equal(clicked, true, `checkbox não encontrado: ${labelText}`);
}

describe("settings panel (mock Tauri)", () => {
  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let page;

  before(async () => {
    browser = await launchBrowser();
    page = await newPage(browser);
    await installTauriMock(page, DEFAULT_SETTINGS);
    await page.goto(APP_ORIGIN, { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-testid="settings-panel"]');
  });

  after(async () => {
    await browser?.close();
  });

  it("abre o painel de configurações no runtime Tauri", async () => {
    const heading = await page.$eval(
      '[data-testid="settings-panel"] h2',
      (el) => el.textContent
    );
    assert.match(heading ?? "", /KoTauri Settings/);
    const shell = await page.$('[data-testid="web-shell"]');
    assert.equal(shell, null);
  });

  it("altera modo compacto e persiste via invoke mock", async () => {
    await clickCheckboxByLabel(page, "Modo compacto");

    await page.waitForFunction(
      () =>
        (window.__kotauriTest?.updates || []).some(
          (u) => u.key === "compact_mode" && u.value === true
        ),
      { timeout: 5000 }
    );

    const updates = await readMockUpdates(page);
    const last = [...updates].reverse().find((u) => u.key === "compact_mode");
    assert.deepEqual(last, { key: "compact_mode", value: true });

    const settings = await readMockSettings(page);
    assert.equal(settings.compact_mode, true);
  });

  it("troca tema para Catppuccin", async () => {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll(".theme-btn")].find((b) =>
        b.textContent?.includes("Catppuccin")
      );
      btn?.click();
    });

    await page.waitForFunction(
      () =>
        (window.__kotauriTest?.updates || []).some(
          (u) => u.key === "theme" && u.value === "catppuccin"
        ),
      { timeout: 5000 }
    );

    const settings = await readMockSettings(page);
    assert.equal(settings.theme, "catppuccin");
  });

  it("não mostra toggles legados sem implementação", async () => {
    const text = await page.$eval('[data-testid="settings-panel"]', (el) =>
      el.textContent || ""
    );
    assert.equal(text.includes("Encaminhar sem autor"), false);
    assert.equal(text.includes("Desabilitar edição com ↑"), false);
    assert.equal(text.includes("mensagens agendadas"), false);
    assert.match(text, /Downloads do Telegram/);
  });

  it("renderiza seção Stories com login e composer mock", async () => {
    const section = await page.waitForSelector('[data-testid="stories-section"]');
    assert.ok(section);
    const hint = await page.$eval('[data-testid="stories-hint"]', (el) => el.textContent || "");
    assert.match(hint, /Login separado/i);

    await page.type('[data-testid="stories-api-id"]', "12345");
    await page.type('[data-testid="stories-api-hash"]', "abc123");
    await page.click('[data-testid="stories-save-api"]');
    await page.waitForSelector('[data-testid="stories-login-form"]');

    await page.type('[data-testid="stories-phone"]', "+5511999999999");
    await page.click('[data-testid="stories-start-login"]');
    await page.waitForSelector('[data-testid="stories-code-form"]');

    await page.type('[data-testid="stories-code"]', "12345");
    await page.click('[data-testid="stories-confirm-login"]');
    await page.waitForSelector('[data-testid="stories-composer"]');

    await page.click('[data-testid="stories-pick-media"]');
    await page.click('[data-testid="stories-publish"]');
    await page.waitForSelector('[data-testid="stories-success"]');
  });

  it("fecha settings via hide_settings", async () => {
    await page.click('[data-testid="settings-close"]');
    await page.waitForFunction(() => window.__kotauriTest?.hidden === true, {
      timeout: 5000,
    });
  });
});
