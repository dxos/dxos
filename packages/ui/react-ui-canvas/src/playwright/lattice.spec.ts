//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SceneManager } from './SceneManager.ts';

const PORT = 9006;
const LATTICE_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--lattice', PORT);

// The fixture: one-cell boxes A (column -1, row -1) and B (column 1, row -1), and Bar spanning columns
// -1..1 on row 1, on the default 256x128 lattice with 128x64 gutters.
test.describe('SceneView lattice', () => {
  let page: Page;
  let scene: SceneManager;
  let close: (() => Promise<void>) | undefined;
  let errors: string[];

  test.beforeEach(async ({ browser }) => {
    errors = [];
    ({ page, close } = await setupPage(browser, { url: LATTICE_URL, viewportSize: { width: 1400, height: 800 } }));
    page.on('pageerror', (error) => errors.push(error.message));
    scene = new SceneManager(page);
    await scene.ready();
  });

  test.afterEach(async () => {
    expect(errors).toEqual([]);
    await close?.();
    close = undefined;
  });

  test('draws the lattice cells', async () => {
    await expect(page.getByTestId('lattice-grid')).toHaveCount(1);
  });

  test('a drag onto occupied cells previews in red and is refused', async () => {
    const a = await scene.box(scene.node('a'));
    const b = await scene.box(scene.node('b'));
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await expect(page.locator('[data-blocked]').first()).toBeVisible();
    await page.mouse.up();
    expect(await scene.box(scene.node('a'))).toEqual(a);
  });

  test('a drag part of the way to a free cell snaps onto it', async () => {
    const a = await scene.box(scene.node('a'));
    // Most of a row down (a row is 192 scene units) lands on the next row, in the same column.
    const row = (192 * (await scene.zoom())) / 100;
    await scene.drag(
      { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      { x: a.x + a.width / 2 + 10, y: a.y + a.height / 2 + row * 0.8 },
    );
    const moved = await scene.box(scene.node('a'));
    expect(Math.abs(moved.x - a.x)).toBeLessThan(2);
    expect(Math.abs(moved.y - (a.y + row))).toBeLessThan(2);
    expect(moved.width).toBeCloseTo(a.width, 0);
  });
});
