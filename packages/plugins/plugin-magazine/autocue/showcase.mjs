//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Browse the Weekend Reading magazine and open an article.
 *
 * @mdl packages/plugins/plugin-magazine/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, fromTemplate, scroll, showcase, visible } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

const tiles = '[data-testid="deck.plank"] img[src*="images.unsplash.com"]';

export const steps = showcase({
  name: 'magazine',
  caption: 'Browse the Weekend Reading magazine and open an article.',
  plugins: ['magazine'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'Reading Room', { waitFor: 'Collections' });
    // Home's Recent card, rather than the navtree: a fresh space's tree sometimes ignores the first expands.
    await page.locator('[data-testid="deck.plank"] :text-is("Weekend Reading")').first().click({ timeout: 15_000 });
    await page.locator(tiles).first().waitFor({ timeout: 30_000 });
    const close = page.locator('role=button[name="Close companion"]');
    if (await visible(close, 1_000)) {
      await close.first().click();
    }
    // The photographs come from the network; start the clip once the first rows have loaded.
    await page.waitForFunction(
      (selector) =>
        [...document.querySelectorAll(selector)].filter((image) => image.complete && image.naturalWidth > 0).length >=
        6,
      tiles,
      { timeout: 30_000 },
    );
    // Off the toolbar, so the clip does not open on a tooltip.
    await page.mouse.move(1_100, 600);
    await page.waitForTimeout(1_000);
  },
  clip: async ({ page }) => {
    await scroll(page, { notches: 14, delta: 60, ms: 110 });
    await page.waitForTimeout(400);
    await scroll(page, { notches: 14, delta: -60, ms: 80 });
    await page.waitForTimeout(400);
    await page.locator(tiles).nth(1).click();
    await page.waitForTimeout(500);
    // Opening a post selects it in the companion; the companion opens beside the magazine to read it.
    const companion = page.locator('[data-testid="plankHeading.companion"]');
    if (await visible(companion, 1_000)) {
      await companion.first().click();
    }
    await page.waitForTimeout(600);
    const post = page.locator('[data-testid="deck.companion.tab.post"]');
    if ((await post.first().getAttribute('aria-selected')) !== 'true') {
      await post.first().click();
    }
    await page.waitForTimeout(3_000);
  },
});
