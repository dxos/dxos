//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Fly into London to street level, on to Tokyo, then spin the globe.
 *
 * @mdl packages/plugins/plugin-map/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, flyTo, leaflet, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'map',
  caption: 'Fly into London to street level, on to Tokyo, then spin the globe.',
  plugins: ['map'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await create(page, 'map', { name: 'World', ready: '.leaflet-container' });
    if (!(await leaflet(page))) {
      throw new Error('no Leaflet map in the plank');
    }
    await page.evaluate(() => window.__showcaseMap.setView([50, 10], 4, { animate: false }));
    await page.waitForTimeout(2_000);
  },
  clip: async ({ page }) => {
    await flyTo(page, [51.5074, -0.1278], 16, 2.8);
    await flyTo(page, [35.6812, 139.7671], 15, 2.8);
    // Out to the whole earth first: the globe inherits the map's zoom, and up close it reads as a flat map.
    await flyTo(page, [35.6812, 139.7671], 3, 1.4);
    // The map's own controls: Toggle switches to the globe, Start spins it.
    await page.locator('[data-testid="deck.plank"] button[aria-label="Toggle"]').last().click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="deck.plank"] button[aria-label="Start"]').last().click();
  },
});
