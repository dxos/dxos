//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Browse the Weekend Reading magazine and open an article.
 *
 * @mdl packages/plugins/plugin-magazine/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/SHOWCASE.md.
 */

import {
  SHORT_MS,
  branch,
  fromTemplate,
  open,
  reveal,
  scroll,
  showcase,
  visible,
} from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

const tiles = '[data-testid="deck.plank"] img[src*="images.unsplash.com"]';

export const steps = showcase({
  name: 'magazine',
  caption: 'Browse the Weekend Reading magazine and open an article.',
  plugins: ['magazine'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'Reading Room', { waitFor: 'Collections' });
    // A fresh space's tree can swallow the first expand while it is still loading, so retry until the collection shows.
    for (let attempt = 0; !(await visible(page.locator(branch('Reading Room')), 2_000)); attempt++) {
      if (attempt === 5) {
        throw new Error('the Reading Room collection never appeared under Collections');
      }
      await reveal(page, ['Collections']);
    }
    await reveal(page, ['Reading Room']);
    await open(page, 'Weekend Reading');
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
