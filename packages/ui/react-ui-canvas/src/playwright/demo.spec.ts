//
// Copyright 2026 DXOS.org
//

//
// Records a walkthrough of the post-M4 fixes (`POST-M4.mdl`) as a video. Not a check — it asserts
// nothing, so it has no place in CI, where it only spends a browser's time and can fail on a cold
// storybook. `DX_DEMO=1 pnpm exec playwright test --config=src/playwright/playwright.config.ts
// src/playwright/demo.spec.ts` records it.
//

import { test } from '@playwright/test';

import { storybookUrl } from '@dxos/test-utils/playwright';

const PORT = 9006;
const DEFAULT_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--default', PORT);
const FREEHAND_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--freehand', PORT);

/** Long enough to read on playback; the recording is for a person, not a machine. */
const BEAT = 900;

// Top level: `use({ video })` forces a new worker, which playwright refuses inside a describe.
test.use({ video: { mode: 'on', size: { width: 1400, height: 900 } }, viewport: { width: 1400, height: 900 } });

test.describe('demo', () => {
  // Skipped unless asked for: playwright runs every spec it finds, so a tag alone would not keep this
  // out of the suite.
  test.skip(!process.env.DX_DEMO, 'set DX_DEMO=1 to record');

  test('post-M4 fixes', async ({ page }) => {
    const settle = () => page.waitForTimeout(BEAT);
    const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 12 });
      await page.mouse.move(to.x, to.y, { steps: 12 });
      await page.mouse.up();
      await settle();
    };

    await page.goto(DEFAULT_URL);
    await page.getByTestId('scene-view').waitFor({ state: 'visible', timeout: 45_000 });
    await page.getByTestId('scene-view').click({ position: { x: 700, y: 500 } });
    await settle();

    // A drawn box is the sweep, and a click that moved nothing creates nothing.
    await page.keyboard.press('r');
    await drag({ x: 300, y: 250 }, { x: 560, y: 420 });
    await page.keyboard.press('r');
    await drag({ x: 900, y: 250 }, { x: 900, y: 250 });

    // A toolbar create holds its screen size across zooms.
    for (const step of ['toolbar-zoom-in', 'toolbar-zoom-in', 'toolbar-zoom-out', 'toolbar-zoom-out']) {
      await page.getByTestId('toolbar-create').click();
      await page.getByRole('menuitem').first().click();
      await settle();
      await page.getByTestId(step).click();
      await settle();
    }

    // Snapping follows the drawn grid, and G hides it with the snap.
    await page.keyboard.press('g');
    await settle();
    await page.keyboard.press('g');
    await settle();

    // Links between bodies, ports on hover, and the smart route.
    await page.goto(FREEHAND_URL);
    await page.getByTestId('scene-view').waitFor({ state: 'visible', timeout: 45_000 });
    await page.getByTestId('scene-view').click({ position: { x: 700, y: 700 } });
    await page.keyboard.press('l');
    await page.mouse.move(300, 300, { steps: 10 });
    await settle();
    await page.mouse.move(700, 400, { steps: 20 });
    await settle();

    const nodes = await page.locator('[data-node-id]').all();
    if (nodes.length >= 2) {
      const from = await nodes[0].boundingBox();
      const to = await nodes[1].boundingBox();
      if (from && to) {
        await page.keyboard.press('o');
        await drag(
          { x: from.x + from.width / 2, y: from.y + from.height / 2 },
          { x: to.x + to.width / 2, y: to.y + to.height / 2 },
        );
        // The route follows the node it joins.
        await drag({ x: to.x + to.width / 2, y: to.y + to.height / 2 }, { x: to.x + to.width / 2 + 160, y: to.y + 40 });
      }
    }
    await settle();
  });
});
