//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Draw a few shapes in tldraw.
 *
 * @mdl packages/plugins/plugin-tldraw/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, drag, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'tldraw',
  caption: 'Draw a few shapes in tldraw.',
  plugins: ['tldraw'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'drawing', { variant: 'tldraw' }),
  clip: async ({ page }) => {
    await page.keyboard.press('r');
    await drag(page, { x: 800, y: 300 }, { x: 1100, y: 500 }, 25);
    await page.keyboard.press('o');
    await drag(page, { x: 1250, y: 320 }, { x: 1500, y: 560 }, 25);
    await page.keyboard.press('a');
    await drag(page, { x: 1100, y: 400 }, { x: 1250, y: 440 }, 25);
    await page.keyboard.press('d');
    await drag(page, { x: 850, y: 700 }, { x: 1450, y: 720 }, 50);
  },
});
