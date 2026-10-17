//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Pan a world map across named cities.
 *
 * @mdl packages/plugins/plugin-map/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `packages/apps/composer-app/autocue/showcase/overnight.mjs`; rules in GridZoom/SHOWCASE.md.
 */

import { SHORT_MS, create, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'map',
  caption: 'Pan a world map across named cities.',
  plugins: ['map'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await create(page, 'map', { name: 'World' });
    await page.mouse.move(1500, 450);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(2_500);
  },
  clip: ({ page }) => orbit(page, { dx: -900, dy: 200, ms: 8_000 }),
});
