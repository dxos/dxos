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
 * Record on a fresh profile. GitHub is a Labs plugin, off by default, so setup enables it; the pull
 * request is public, so no GitHub connection is needed.
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

/** Whether the GitHub plugin is on in this profile. */
const githubEnabled = (page) =>
  page.evaluate(() =>
    globalThis.composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.github' && plugin.enabled),
  );

export const steps = [
  {
    name: 'Prep (off camera): enable the GitHub plugin',
    setup: true,
    done: ({ page }) => githubEnabled(page),
    run: async ({ demo, page }) => {
      // The switch toggles, so a profile that already has the plugin on is left alone.
      if (await githubEnabled(page)) {
        return;
      }
      await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
      await demo.fill({ selector: 'input[placeholder="Filter…"]', value: 'github', hud: false });
      // The switch's input is visually hidden; its parent is the control a person clicks.
      await demo.click({ selector: 'role=switch[name="GitHub"] >> xpath=..', hud: false });
      await page.waitForFunction(
        () => globalThis.composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.github' && plugin.active),
        undefined,
        { timeout: 15_000 },
      );
    },
  },
  {
    name: 'Prep (off camera): authenticate GitHub reads when a token is available',
    setup: true,
    run: async ({ page }) => {
      // A shared egress IP exhausts GitHub's anonymous limit (60 an hour), which fails the import with 403.
      const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
      if (!token) {
        return;
      }
      await page.unroute('https://api.github.com/**').catch(() => {});
      await page.route('https://api.github.com/**', (route) =>
        route.continue({ headers: { ...route.request().headers(), authorization: `Bearer ${token}` } }),
      );
    },
  },
  {
    name: 'Prep (off camera): dismiss notices and settle on the space',
    setup: true,
    run: async ({ demo, page }) => {
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
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', hud: false });
      await demo.click({ selector: '[data-testid="spacePlugin.spaceHome"]', hud: false });
      await page.locator('[data-testid="deck.plank"][data-attendable-id$="/home"]').first().waitFor();
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
