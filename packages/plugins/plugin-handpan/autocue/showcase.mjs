//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Play a melody around the handpan.
 *
 * @mdl packages/plugins/plugin-handpan/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'handpan',
  caption: 'Play a melody around the handpan.',
  plugins: ['handpan'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'instrument', { name: 'Handpan' }),
  clip: async ({ page }) => {
    for (const label of ['D', '1', '3', '5', '7', '8', '6', '4', '2', 'D', '5', '8', '6', '3', '1', 'D']) {
      await page.locator(`[data-testid="handpan.note.${label}"]`).first().click();
      await page.waitForTimeout(560);
    }
  },
});
