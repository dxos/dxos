//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (20s): Select a shape in the Composer architecture drawing, read its properties, and rename it.
 *
 * @mdl packages/plugins/plugin-canvas/PLUGIN.mdl test QA-4
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { LONG_MS, fromTemplate, reveal, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = LONG_MS;

export const steps = showcase({
  name: 'canvas',
  caption: 'Select a shape in the Composer architecture drawing, read its properties, and rename it.',
  plugins: ['canvas'],
  ms: CLIP_MS,
  setup: async ({ page }) => {
    await fromTemplate(page, 'DXOS Architecture');
    await reveal(page, ['Collections', 'Architecture']);
    await page.locator('[data-testid="treeItem.heading"]:text-is("Overview")').first().click();
    await page.waitForTimeout(3_000);
  },
  clip: async ({ page }) => {
    // The template's drawings open read-only, which also hides the Properties panel; unlock first.
    await page.locator('[data-testid="palette-readonly"]').last().click();
    await page.waitForTimeout(600);
    const box = page.locator('[data-testid="deck.plank"] :text-is("React UI")').last();
    await box.click();
    await page.waitForTimeout(1_500);
    // The Properties panel opens beside the drawing; scroll through it.
    const panel = await page
      .locator('[data-testid="properties"]')
      .last()
      .boundingBox({ timeout: 5_000 })
      .catch(() => null);
    if (panel) {
      await page.mouse.move(panel.x + panel.width / 2, panel.y + 300);
      for (let notch = 0; notch < 12; notch++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(150);
      }
      for (let notch = 0; notch < 12; notch++) {
        await page.mouse.wheel(0, -60);
        await page.waitForTimeout(100);
      }
    }
    await box.dblclick();
    await page.waitForTimeout(600);
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('React components', { delay: 70 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2_500);
  },
});
