//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SceneManager } from './SceneManager.ts';

const PORT = 9006;
const LATTICE_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--lattice', PORT);

// The fixture, on the default 256x128 lattice with 128x64 gutters, columns and rows -1..1: A, B, C down
// column -1; a free cell above D and E in column 0; F spanning all three rows of column 1.
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

  test('the guides toggle hides and restores the lattice cells', async () => {
    await page.getByTestId('toolbar-guides').click();
    await expect(page.getByTestId('lattice-grid')).toHaveCount(0);
    await scene.focus();
    await page.keyboard.press(';');
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
    // Most of a column right (a column is 384 scene units) lands on the free cell next to A, in the same row.
    const column = (384 * (await scene.zoom())) / 100;
    await scene.drag(
      { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      { x: a.x + a.width / 2 + column * 0.8, y: a.y + a.height / 2 + 10 },
    );
    const moved = await scene.box(scene.node('a'));
    expect(Math.abs(moved.x - (a.x + column))).toBeLessThan(2);
    expect(Math.abs(moved.y - a.y)).toBeLessThan(2);
    expect(moved.width).toBeCloseTo(a.width, 0);
  });

  test('with snap off a drag lands where it is dropped and nothing is refused', async () => {
    await scene.focus();
    await page.keyboard.press('g');
    const a = await scene.box(scene.node('a'));
    const column = (384 * (await scene.zoom())) / 100;
    await scene.drag(
      { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      { x: a.x + a.width / 2 + column * 0.4, y: a.y + a.height / 2 },
    );
    const moved = await scene.box(scene.node('a'));
    // Part of a column, not snapped back or onto the next cell.
    expect(moved.x - a.x).toBeGreaterThan(column * 0.2);
    expect(moved.x - a.x).toBeLessThan(column * 0.8);
  });

  test('with the lattice off, snap lands on the basic grid and the cells are hidden', async () => {
    await page.getByTestId('toolbar-lattice').click();
    await expect(page.getByTestId('lattice-grid')).toHaveCount(0);
    const a = await scene.box(scene.node('a'));
    const column = (384 * (await scene.zoom())) / 100;
    await scene.drag(
      { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      { x: a.x + a.width / 2 + column * 0.4, y: a.y + a.height / 2 },
    );
    const moved = await scene.box(scene.node('a'));
    expect(moved.x - a.x).toBeGreaterThan(column * 0.2);
    expect(moved.x - a.x).toBeLessThan(column * 0.8);
    // On, the lattice is back.
    await scene.focus();
    await page.keyboard.press('Shift+G');
    await expect(page.getByTestId('lattice-grid')).toHaveCount(1);
  });

  test('dragging a face steps it one cell and leaves the opposite face where it was', async () => {
    // Fit frames the shapes tightly, so step out to leave room below E for the drag.
    await scene.zoomOut();
    await scene.clickNode('e');
    const before = await scene.box(scene.node('e'));
    // E's east neighbour is F, so grow downwards: the south face most of a row down.
    const handle = await scene.handle('e', 's');
    const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const row = (192 * (await scene.zoom())) / 100;
    await scene.drag(from, { x: from.x, y: from.y + row * 0.8 });
    const after = await scene.box(scene.node('e'));
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
    expect(Math.abs(after.y + after.height - (before.y + before.height + row))).toBeLessThan(2);
  });
});
