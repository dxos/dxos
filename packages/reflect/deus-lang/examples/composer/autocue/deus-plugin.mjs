//
// Copyright 2026 DXOS.org
//

/**
 * A Composer plugin written in DEUS, loaded by URL: create a DEUS codebase object, search the codebase,
 * read a definition, follow a reference and pin it (the pin is stored on the ECHO object).
 *
 * @app composer-app production bundle served by `vite preview` on :4173, and the plugin built by
 *   `examples/composer/build.sh` served with CORS on :3968
 *
 *   DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort   # in packages/apps/composer-app
 *   bash examples/composer/build.sh /tmp/deus-plugin && <a CORS static server> /tmp/deus-plugin :3968
 */

const MANIFEST = 'http://localhost:3968/manifest.json';
const SEARCH = 'input[placeholder="Search definitions…"]';
const row = (name) => `.deus-row:has(.deus-name:text-is("${name}"))`;

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and the help panel',
    setup: true,
    run: async ({ page }) => {
      const notice = page.locator('[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))');
      if (await notice.count()) {
        await notice.first().click();
      }
      const help = page.locator('[data-testid="deck.companion"] button:has(svg[data-icon="ph--x--regular"])');
      if (await help.count()) {
        await help.first().click().catch(() => {});
      }
    },
  },
  {
    name: 'Load the DEUS plugin by URL',
    done: ({ page }) => page.evaluate(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.deus.explorer')),
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A Composer plugin written in DEUS', subtitle: 'compiled with deus build --js, loaded by URL' });
      // The rail item toggles the sidebar, and a closed sidebar leaves the action in the DOM under the app menu.
      const reachable = () => {
        const button = document.querySelector('button[aria-label="Load from URL"]');
        const box = button?.getBoundingClientRect();
        return !!box && box.width > 0 && !!button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      };
      if (!(await page.evaluate(reachable))) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', label: 'Plugins' });
        await page.waitForFunction(reachable, null, { timeout: 5_000 });
      }
      await demo.click({ selector: 'button[aria-label="Load from URL"]', label: 'Load from URL' });
      await demo.fill({ selector: 'input[placeholder="https://example.com/manifest.json"]', value: MANIFEST });
      await demo.click({ selector: 'button:text-is("Load Plugin")', label: 'Load Plugin' });
      await page.waitForFunction(() => composer.plugins().some((plugin) => plugin.id === 'org.dxos.deus.explorer' && plugin.enabled), null, { timeout: 30_000 });
    },
  },
  {
    name: 'Create a DEUS codebase object',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Create a DEUS codebase', subtitle: 'an ECHO type the plugin registers' });
      await demo.click({ selector: '[data-testid="spacePlugin.space"] >> nth=0', label: 'Space' });
      const opener = page.locator('button:visible:has-text("Open sidebar")');
      if (await opener.count()) {
        await demo.click({ selector: 'button:visible:has-text("Open sidebar")', label: 'Open sidebar' });
      }
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.deus.type.codebase"]', label: 'DEUS codebase' });
      await page.locator(SEARCH).waitFor({ timeout: 15_000 });
      await page.locator('.deus-row').first().waitFor({ timeout: 15_000 });
    },
  },
  {
    name: 'Search the codebase and open List.map',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Search every definition', subtitle: 'names.json of the toolchain codebase' });
      await demo.type({ selector: SEARCH, value: 'List.map' });
      await demo.click({ selector: row('List.map'), label: 'List.map' });
      await page.locator('.deus-def h2:text-is("List.map")').waitFor({ timeout: 10_000 });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'Pin it on the object',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Pin it', subtitle: 'stored on the ECHO object, so it syncs to the space' });
      await demo.click({ selector: '.deus-def button:text-is("Pin")', label: 'Pin' });
      await page.locator('.deus-def button:has-text("Unpin")').waitFor({ timeout: 10_000 });
    },
  },
  {
    name: 'Follow a reference',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Follow references', subtitle: 'names in the source and the uses / used-by lists' });
      await demo.click({ selector: '.deus-source a.ref >> nth=0', label: 'List' });
      await page.locator('.deus-def h2:text-is("List")').waitFor({ timeout: 10_000 });
      await page.waitForTimeout(1200);
      await demo.click({ selector: '.deus-def .deus-chip >> nth=2', label: 'Used by' });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'Clear the search: the pin is listed first',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Pinned definitions come first', subtitle: 'read back from ECHO' });
      await demo.fill({ selector: SEARCH, value: '' });
      await page.locator('.deus-list h3:text-is("Pinned")').waitFor({ timeout: 10_000 });
      await page.waitForTimeout(2000);
    },
  },
];
