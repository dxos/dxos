//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Create the DXOS Architecture space from its template, open a drawing and drill into a box.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `packages/apps/composer-app/autocue/showcase/overnight.mjs`; rules in GridZoom/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, orbit, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'canvas',
  plugins: ['canvas'],
  ms: CLIP_MS,
  clip: async ({ page }) => {
    await fromTemplate(page, 'DXOS Architecture');
    await page.locator('[data-testid="treeItem.heading"]').nth(1).click();
    await page.waitForTimeout(3_000);
    await orbit(page, { dx: 300, dy: 60, ms: 3_000 });
    const { width, height } = page.viewportSize();
    await page.mouse.dblclick(350 + (width - 400) / 2, height / 2);
    await page.waitForTimeout(3_000);
  },
});
