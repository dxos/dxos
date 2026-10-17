//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Fill a step grid in a new score.
 *
 * @mdl packages/plugins/plugin-sequencer/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `packages/apps/composer-app/autocue/showcase/overnight.mjs`; rules in GridZoom/SHOWCASE.md.
 */

import { SHORT_MS, create, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'sequencer',
  plugins: ['sequencer'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'score'),
  clip: async ({ page }) => {
    // Clicks steps across the grid in a rising pattern, as a person laying down a beat would.
    const { width, height } = page.viewportSize();
    for (let i = 0; i < 16; i++) {
      await page.mouse.click(350 + (width - 400) * (0.15 + 0.045 * i), height * (0.7 - 0.025 * (i % 8)));
      await page.waitForTimeout(450);
    }
  },
});
