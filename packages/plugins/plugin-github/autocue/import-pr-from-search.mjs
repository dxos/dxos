//
// Copyright 2026 DXOS.org
//

/**
 * Paste a pull request URL into Cmd+K, import it from the row the dialog offers, and land on it.
 *
 * @mdl packages/plugins/plugin-github/PLUGIN.mdl test QA-4
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 * Built and served from `packages/apps/composer-app`:
 *
 *   export DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; the pull request is public, so no GitHub connection is needed.
 */

/** A public pull request, read anonymously. */
const URL = 'https://github.com/dxos/dxos/pull/1';
const ROW = 'Import dxos/dxos#1 from GitHub';

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** The search dialog's input. */
const INPUT = '[role="dialog"] input >> nth=0';

/** The imported pull request's title, as the navtree and its plank show it. */
const TITLE = 'chore: release 1.0.0';

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and settle on the space',
    setup: true,
    run: async ({ page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Open the search dialog',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Press Cmd+K to open search', subtitle: 'plugin-github/PLUGIN.mdl QA-4' });
      const isMac = await page.evaluate(() => /Mac/.test(navigator.platform));
      await demo.press({ key: isMac ? 'Meta+k' : 'Control+k' });
      await page.locator(INPUT).waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Paste the pull request URL',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Paste a pull request URL',
        subtitle: 'the row is built from the URL — no GitHub call yet',
      });
      await demo.fill({ selector: INPUT, value: URL });
      await page.locator(`role=option[name="${ROW}"]`).waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Import and open it',
    done: async ({ page }) => (await page.getByText(TITLE).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Choose the row: import into the space and open it' });
      await demo.click({ selector: `role=option[name="${ROW}"]`, label: ROW });
      await page.locator('[role="dialog"] input').waitFor({ state: 'detached', timeout: 10_000 });
      await page
        .locator('[data-testid="deck.plank"]', { hasText: TITLE })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
];
