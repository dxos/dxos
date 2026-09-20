//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SceneManager } from './SceneManager.ts';

const PORT = 9006;
const FREEHAND_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--freehand', PORT);

// The fixture (`createSceneTree(1)`): rectangle A, ellipse B, text T, class C; links A→B (curve), A→C
// (line, directed) and B→C (spline). Every edge sits on the major grid.
test.describe('SceneView', () => {
  let page: Page;
  let scene: SceneManager;
  let close: (() => Promise<void>) | undefined;
  let errors: string[];

  test.beforeEach(async ({ browser }) => {
    ({ page, close } = await setupPage(browser, { url: FREEHAND_URL, viewportSize: { width: 1400, height: 800 } }));
    errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    scene = new SceneManager(page);
    await scene.ready();
  });

  test.afterEach(async () => {
    expect(errors).toEqual([]);
    await close?.();
    close = undefined;
  });

  test('draws the fixture with an arrowhead on the directed link', async () => {
    await expect(page.locator('[data-node-id]')).toHaveCount(4);
    expect(await scene.linkCount()).toBe(3);
    // One marker set per layer (arrow and circle, start and end); the directed line uses the end arrow.
    await expect(page.locator('[data-testid="scene-view"] marker')).toHaveCount(4);
    await expect(page.locator('[data-testid="scene-view"] path[marker-end]')).toHaveCount(1);
  });

  test('a create drag previews the node as a ghost and creates it on release', async () => {
    const view = await scene.box(scene.root);
    await scene.focus();
    await page.keyboard.press('r');
    const from = { x: view.x + view.width * 0.5, y: view.y + view.height * 0.6 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 150, from.y + 80, { steps: 6 });
    await expect(page.locator('[data-ghost]')).toHaveCount(1);
    await page.mouse.up();
    await expect(page.locator('[data-ghost]')).toHaveCount(0);
    expect(await scene.nodeCount()).toBe(5);
  });

  test('dragging a node type from the palette creates it where it drops', async () => {
    const view = await scene.box(scene.root);
    const entry = await scene.box(page.getByTestId('palette-E'));
    await page.mouse.move(entry.x + entry.width / 2, entry.y + entry.height / 2);
    await page.mouse.down();
    await page.mouse.move(entry.x + 40, entry.y + 40, { steps: 4 });
    await page.mouse.move(view.x + view.width * 0.7, view.y + view.height * 0.8, { steps: 10 });
    await expect(page.locator('[data-ghost]')).toHaveCount(1);
    await page.mouse.up();
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
  });

  test('hovering outlines the node and D labels every frame', async () => {
    const box = await scene.box(scene.node('scene:root/a'));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(scene.node('scene:root/a')).toHaveClass(/border-primary-500\/50/);
    await scene.focus();
    await page.keyboard.press('d');
    await expect(page.getByTestId('node-debug')).toHaveCount(4);
    await page.keyboard.press('d');
    await expect(page.getByTestId('node-debug')).toHaveCount(0);
  });

  test('shift-resize keeps the centre; a plain resize keeps the opposite edge', async () => {
    const id = 'scene:root/a';
    await scene.clickNode(id);
    const before = await scene.box(scene.node(id));
    let east = await scene.handle(id, 'e');
    await scene.drag({ x: east.x + east.width / 2, y: east.y + east.height / 2 }, { x: east.x + 70, y: east.y });
    const plain = await scene.box(scene.node(id));
    expect(plain.x).toBeCloseTo(before.x, 0);
    expect(plain.width).toBeGreaterThan(before.width);

    east = await scene.handle(id, 'e');
    await scene.drag(
      { x: east.x + east.width / 2, y: east.y + east.height / 2 },
      { x: east.x + 70, y: east.y },
      'Shift',
    );
    const symmetric = await scene.box(scene.node(id));
    expect(symmetric.width).toBeGreaterThan(plain.width);
    expect(symmetric.x + symmetric.width / 2).toBeCloseTo(plain.x + plain.width / 2, 0);
  });

  test('a marquee replaces the selection, shift adds and alt subtracts', async () => {
    const a = await scene.box(scene.node('scene:root/a'));
    // The empty canvas below and right of A, dragging back over A's corner.
    const outside = { x: a.x + a.width + 40, y: a.y + a.height + 60 };
    const inside = { x: a.x + a.width - 20, y: a.y + a.height - 20 };
    await scene.focus();
    await page.keyboard.press('Control+a');
    await scene.drag(outside, inside, 'Alt');
    expect(await scene.selectedNodes()).toEqual(['scene:root/b', 'scene:root/t', 'scene:root/c']);
    await scene.drag(outside, inside, 'Shift');
    expect((await scene.selectedNodes()).sort()).toEqual([
      'scene:root/a',
      'scene:root/b',
      'scene:root/c',
      'scene:root/t',
    ]);
    await scene.drag(outside, inside);
    expect(await scene.selectedNodes()).toEqual(['scene:root/a']);
  });

  test('the line tool draws a free-ended link on empty canvas', async () => {
    const view = await scene.box(scene.root);
    await scene.focus();
    await page.keyboard.press('l');
    const from = { x: view.x + view.width * 0.55, y: view.y + view.height * 0.85 };
    await scene.drag(from, { x: from.x + 200, y: from.y - 40 });
    expect(await scene.linkCount()).toBe(4);
    expect(await scene.nodeCount()).toBe(4);
  });

  test('the toolbar zooms, creates at the centre and deletes the selection', async () => {
    const readout = page.getByTestId('canvas-toolbar');
    await expect(readout).toContainText('70%');
    await page.getByTestId('toolbar-zoom-in').click();
    await expect(readout).toContainText('87%');
    await page.getByTestId('toolbar-create').click();
    await page.getByTestId('create-class').click();
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
    await page.getByTestId('toolbar-delete').click();
    await expect(page.locator('[data-node-id]')).toHaveCount(4);
    await expect(page.getByTestId('toolbar-layout')).toBeDisabled();
  });

  test('the properties panel edits the selected class', async () => {
    await scene.clickNode('scene:root/c');
    const labels = await page.locator('[data-testid="properties"] label').allTextContents();
    expect(labels).toEqual(expect.arrayContaining(['Name', 'Attributes', 'Methods', 'Hue']));
  });
});
