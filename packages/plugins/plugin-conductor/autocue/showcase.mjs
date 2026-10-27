//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Open a new compute circuit.
 *
 * @mdl packages/plugins/plugin-conductor/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'conductor',
  caption: 'Open a new compute circuit.',
  plugins: ['conductor'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'canvasBoard'),
  clip: async ({ page }) => {
    // First pass: a slow look across the new object; refine the gesture once the overnight report shows the render.
    const { width, height } = page.viewportSize();
    for (const [x, y] of [
      [0.3, 0.3],
      [0.6, 0.35],
      [0.5, 0.6],
      [0.35, 0.55],
    ]) {
      await page.mouse.move(350 + (width - 400) * x, height * y, { steps: 20 });
      await page.mouse.click(350 + (width - 400) * x, height * y);
      await page.waitForTimeout(1_500);
    }
  },
});
