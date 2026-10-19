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

import { SHORT_MS, fromTemplate, open, reveal, scroll, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

const tiles = '[data-testid="deck.plank"] img[src*="images.unsplash.com"]';

export const steps = showcase({
  name: 'magazine',
  caption: 'Browse the Weekend Reading magazine and open an article.',
  plugins: ['magazine'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'Reading Room', { waitFor: 'Collections' });
    await reveal(page, ['Collections', 'Reading Room']);
    await open(page, 'Weekend Reading');
    // The photographs come from the network; start the clip once the first rows have loaded.
    await page.waitForFunction(
      (selector) => [...document.querySelectorAll(selector)].filter((image) => image.complete).length >= 6,
      tiles,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(1_000);
  },
  clip: async ({ page }) => {
    await scroll(page, { notches: 16, delta: 45, ms: 120 });
    await page.waitForTimeout(500);
    await scroll(page, { notches: 16, delta: -45, ms: 90 });
    await page.waitForTimeout(600);
    await page.locator(tiles).nth(1).click();
    await page.waitForTimeout(3_000);
  },
});
