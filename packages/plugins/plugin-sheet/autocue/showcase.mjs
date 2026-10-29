//
// Copyright 2026 DXOS.org
//

/**
 * Showcase clip (10s): Fill a sheet with values and formulas.
 *
 * @mdl packages/plugins/plugin-sheet/PLUGIN.mdl test QA-4
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 *
 * Recorded by `tools/autocue/showcase/overnight.mjs`; rules in tools/autocue/showcase/docs/SHOWCASE.md.
 */

import { SHORT_MS, create, showcase } from '../../../../tools/autocue/showcase/steps.mjs';

export const CLIP_MS = SHORT_MS;

export const steps = showcase({
  name: 'sheet',
  caption: 'Fill a sheet with values and formulas.',
  plugins: ['sheet'],
  ms: CLIP_MS,
  setup: ({ page }) => create(page, 'sheet'),
  clip: async ({ page }) => {
    for (const [index, row] of [
      ['Q1', '120', '=B1*2'],
      ['Q2', '140', '=B2*2'],
      ['Q3', '95', '=B3*2'],
      ['Q4', '180', '=B4*2'],
    ].entries()) {
      await page
        .locator(`.dx-grid [data-dx-grid-plane="grid"] [aria-colindex="0"][aria-rowindex="${index}"]`)
        .first()
        .click();
      for (const [col, value] of row.entries()) {
        await page.keyboard.type(value, { delay: 45 });
        await page.waitForTimeout(250);
        await page.keyboard.press(col < row.length - 1 ? 'Tab' : 'Enter');
      }
    }
  },
});
