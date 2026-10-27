//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Draw shapes on an SVG drawing.
 *
 * @mdl packages/plugins/plugin-illustrator/PLUGIN.mdl test QA-4
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, drag, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'illustrator',
  caption: 'Draw shapes on an SVG drawing.',
  plugins: ['illustrator'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'drawing', { variant: 'svg' }),
  clip: async ({ page }) => {
    for (const [tool, from, to] of [
      ['R', { x: 750, y: 300 }, { x: 1000, y: 420 }],
      ['E', { x: 1200, y: 300 }, { x: 1450, y: 420 }],
      ['R', { x: 950, y: 600 }, { x: 1250, y: 720 }],
    ]) {
      await page.locator(`[data-testid="palette-${tool}"]`).last().click();
      await drag(page, from, to, 25);
      await page.waitForTimeout(600);
    }
  },
});
