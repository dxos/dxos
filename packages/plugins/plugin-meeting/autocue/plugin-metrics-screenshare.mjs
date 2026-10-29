//
// Copyright 2026 DXOS.org
//

/**
 * The screen Lucía shares in the four-person meeting: the DXOS Architecture template's "Plugin metrics" sheet, whose
 * chart she switches from horizontal to vertical bars.
 *
 * @app composer-app dev build (plugin-canvas's DXOS Architecture template on), via
 *   `DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 *
 * Recorded without the action feed or captions, since it plays inside a call tile as a screenshare:
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out temp/meeting/screenshare \
 *     --theme light --captions off --overlay off --width 1600 --height 1000
 *
 * Trim it, then hand the result to `conversation.mjs` as `--screenshare lucia=<demo.webm>`.
 */

const TEMPLATE = 'DXOS Architecture';
const SHEET = 'Plugin metrics';
const CANVAS = 'org.dxos.plugin.canvas';
const SHEETS = 'org.dxos.plugin.sheet';
const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

const appears = (locator, timeout) =>
  locator.waitFor({ state: 'visible', timeout }).then(
    () => true,
    () => false,
  );

export const steps = [
  {
    name: 'Prep (off camera): the DXOS Architecture space, with its plugin metrics open',
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (await appears(notice.first(), 8_000)) {
        await notice
          .first()
          .click({ timeout: 10_000 })
          .catch(() => {});
      }
      await page.evaluate(
        (ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }),
        [CANVAS, SHEETS],
      );
      await page.waitForFunction(
        (ids) => composer.plugins().filter((plugin) => ids.includes(plugin.id) && plugin.enabled).length === ids.length,
        [CANVAS, SHEETS],
        { timeout: 60_000, polling: 500 },
      );

      await page.keyboard.press('Escape');
      await demo.click({ selector: '[data-testid="spacePlugin.addSpace"]', hud: false });
      await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
      await demo.click({
        selector: `[data-testid="create-space-dialog"] [role="option"]:has-text("${TEMPLATE}")`,
        hud: false,
      });
      // Create stays disabled until the template has filled in the space's name.
      await page
        .locator('[data-testid="create-space-dialog"] button:has-text("Create"):not([disabled])')
        .waitFor({ timeout: 30_000 });
      await demo.click({ selector: '[data-testid="create-space-dialog"] button:has-text("Create")', hud: false });
      await page.locator('[data-testid="create-space-dialog"]').waitFor({ state: 'detached', timeout: 60_000 });

      // The template finishes by opening the space's Home, whose Recent list leads to the sheet.
      await page.locator(`${PLANK} :text-is("${SHEET}")`).first().waitFor({ timeout: 180_000 });
      await page.waitForTimeout(BEAT);
      await page.locator(`${PLANK} :text-is("${SHEET}")`).first().click();
      await page.locator(`${PLANK} [data-testid="grid.0.0"]`).waitFor({ timeout: 30_000 });
      // The shared screen is about the sheet, so the navigation sidebar goes.
      await page.locator('button[data-type="action"][data-object-id$="updateSidebar.nav"]').first().click();
      await page.waitForTimeout(BEAT);
      await demo.cut();
    },
  },
  {
    name: 'Open the chart and switch it to vertical bars',
    run: async ({ demo, page }) => {
      await page.waitForTimeout(BEAT * 2);
      await demo.click({ selector: '[data-testid="deck.companion.tab.charts"]', label: 'Charts' });
      await page.waitForTimeout(BEAT * 2);
      await demo.click({ selector: `${COMPANION} button[aria-label="Edit"]`, label: 'Edit chart' });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${COMPANION} label:has-text("Horizontal bars")`, label: 'Horizontal bars' });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${COMPANION} button:has-text("Save")`, label: 'Save' });
      // Off the chart, so no hover tooltip sits over the redrawn bars.
      await page.mouse.move(300, 600);
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
