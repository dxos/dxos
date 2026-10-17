//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Open the Composer architecture drawing from the DXOS Architecture space and drill into a box.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, orbit, reveal, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'canvas',
  caption: 'Open the Composer architecture drawing from the DXOS Architecture space and drill into a box.',
  plugins: ['canvas'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'DXOS Architecture');
    await reveal(page, ['Collections', 'Architecture']);
  },
  clip: async ({ page }) => {
    // The collection lists the three documents before the drawings, so the second Composer is the drawing.
    await page.locator('[data-testid="treeItem.heading"]:text-is("Composer")').nth(1).click();
    await page.waitForTimeout(3_500);
    await orbit(page, { dx: 300, dy: 60, ms: 3_000 });
    const box = page.locator('[data-testid="deck.plank"] :text-is("Framework")').last();
    if (await box.count()) {
      await box.dblclick();
    } else {
      const { width, height } = page.viewportSize();
      await page.mouse.dblclick(350 + (width - 400) / 2, height / 2);
    }
    await page.waitForTimeout(3_500);
  },
});
