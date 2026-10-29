//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Draw class shapes on a canvas.
 *
 * @mdl packages/plugins/plugin-uml/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, drag, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'uml',
  caption: 'Draw class shapes on a canvas.',
  plugins: ['canvas', 'uml'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'drawing', { variant: 'Canvas' }),
  clip: async ({ page }) => {
    for (const [from, to] of [
      [
        { x: 750, y: 300 },
        { x: 1000, y: 460 },
      ],
      [
        { x: 1250, y: 300 },
        { x: 1500, y: 460 },
      ],
    ]) {
      await page.locator('[data-testid="palette-C"]').last().click();
      await drag(page, from, to, 25);
      await page.waitForTimeout(800);
    }
  },
});
