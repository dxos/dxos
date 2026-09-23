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
    // Reset before the page opens, so a launch failure reports itself rather than a stale error list.
    errors = [];
    ({ page, close } = await setupPage(browser, { url: FREEHAND_URL, viewportSize: { width: 1400, height: 800 } }));
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
    // The ghost sits inside the frame the node will land in.
    await expect(page.getByTestId('create-frame')).toHaveCount(1);
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
    // A drop carries the palette's own preview, so the canvas shows the frame alone.
    await expect(page.getByTestId('create-frame')).toHaveCount(1);
    await expect(page.locator('[data-ghost]')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
  });

  test('hovering outlines the node and reveals its ports, and D labels every frame', async () => {
    const ports = page.locator('[data-testid="scene-view"] circle.cursor-crosshair');
    await expect(ports).toHaveCount(0);
    const box = await scene.box(scene.node('scene:root/a'));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(scene.node('scene:root/a')).toHaveClass(/border-primary-500\/50/);
    await expect(ports).not.toHaveCount(0);
    await page.mouse.move(box.x + box.width + 200, box.y + box.height + 200);
    await expect(ports).toHaveCount(0);
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
    // The empty canvas above and left of A, dragging back over A's corner. Not the other corner: the
    // B→C spline passes below and right of A, and a press on a link starts an endpoint drag.
    const outside = { x: a.x - 40, y: a.y - 60 };
    const inside = { x: a.x + 20, y: a.y + 20 };
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
    // Zoom out once so the band below is there whatever the initial fit frames.
    await page.getByTestId('toolbar-zoom-out').click();
    const view = await scene.box(scene.root);
    await scene.focus();
    await page.keyboard.press('l');
    // The band right of every node, so the whole gesture lands on empty canvas however the fixture is laid out.
    const right = await scene.nodesRight();
    const band = view.x + view.width - right;
    expect(band).toBeGreaterThan(120);
    const from = { x: right + band * 0.2, y: view.y + view.height / 2 };
    await scene.drag(from, { x: right + band * 0.8, y: from.y - 40 });
    expect(await scene.linkCount()).toBe(4);
    expect(await scene.nodeCount()).toBe(4);
  });

  test('picking a creation tool clears the selection', async () => {
    await scene.clickNode('scene:root/a');
    expect(await scene.selectedNodes()).toEqual(['scene:root/a']);
    await scene.focus();
    await page.keyboard.press('r');
    expect(await scene.selectedNodes()).toEqual([]);
  });

  test('the line tool links two node bodies, without aiming at a port', async () => {
    const before = await scene.linkCount();
    await scene.focus();
    await page.keyboard.press('l');
    // Centre to centre: neither end is within reach of a port, so both endpoints bind to the body.
    const from = await scene.box(scene.node('scene:root/a'));
    const to = await scene.box(scene.node('scene:root/c'));
    await scene.drag(
      { x: from.x + from.width / 2, y: from.y + from.height / 2 },
      { x: to.x + to.width / 2, y: to.y + to.height / 2 },
    );
    expect(await scene.linkCount()).toBe(before + 1);
    // No node was created: the drop landed on an existing one rather than on empty canvas.
    expect(await scene.nodeCount()).toBe(4);
  });

  test('the toolbar zooms, creates at the centre and deletes the selection', async () => {
    // The fit zoom follows the fixture's bounds, so the step is read against it rather than named.
    const fitted = await scene.zoom();
    await page.getByTestId('toolbar-zoom-in').click();
    // One step is ×1.25; both readouts round, so they can disagree by a point.
    await expect.poll(async () => Math.abs((await scene.zoom()) - fitted * 1.25)).toBeLessThanOrEqual(1);
    await page.getByTestId('toolbar-create').click();
    await page.getByTestId('create-class').click();
    await expect(page.locator('[data-node-id]')).toHaveCount(5);
    await page.getByTestId('toolbar-delete').click();
    await expect(page.locator('[data-node-id]')).toHaveCount(4);
    // Freehand offers auto layout; a → b → c ranks into three rows, whatever the fixture's own layout.
    await expect(page.getByTestId('toolbar-layout')).toBeEnabled();
    await page.getByTestId('toolbar-layout').click();
    await expect
      .poll(async () => {
        const rows = await Promise.all(
          ['scene:root/a', 'scene:root/b', 'scene:root/c'].map(async (id) => (await scene.box(scene.node(id))).y),
        );
        return rows[0] < rows[1] && rows[1] < rows[2];
      })
      .toBe(true);
    // A portal made from the toolbar gets its child scene, so Enter opens it.
    await page.getByTestId('toolbar-create').click();
    await page.getByTestId('create-scene').click();
    await scene.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('toolbar-up')).toBeEnabled();
  });

  test('the properties panel edits the selected class', async () => {
    await scene.clickNode('scene:root/c');
    const labels = await page.locator('[data-testid="properties"] label').allTextContents();
    expect(labels).toEqual(expect.arrayContaining(['Name', 'Attributes', 'Methods', 'Hue']));
    // Geometry is two labelled cells per row, not a collapsible fieldset.
    expect(labels).toEqual(expect.arrayContaining(['Center', 'X', 'Y', 'Size', 'W', 'H']));
  });

  test('the geometry cells step by the grid and move the node', async () => {
    await scene.clickNode('scene:root/c');
    const node = await scene.box(scene.node('scene:root/c'));
    const x = page.locator('[data-testid="properties"] input[type="number"]').first();
    const read = async () => Number(await x.inputValue());
    const start = await read();
    await x.focus();
    // One arrow press is a minor cell (16), Shift a major one (64) — the same units an arrow nudge uses.
    await x.press('ArrowUp');
    await expect.poll(read).toBe(start + 16);
    await x.press('Shift+ArrowUp');
    await expect.poll(read).toBe(start + 16 + 64);
    // The node followed, so the edit reached the model as an intent rather than staying in the input.
    await expect.poll(async () => (await scene.box(scene.node('scene:root/c'))).x).toBeGreaterThan(node.x);
  });

  test('a read-only view selects but draws no handles and applies no edit', async ({ browser }) => {
    await close?.();
    ({ page, close } = await setupPage(browser, {
      url: storybookUrl('ui-react-ui-canvas-scene-sceneview--readonly', PORT),
      viewportSize: { width: 1400, height: 800 },
    }));
    page.on('pageerror', (error) => errors.push(error.message));
    scene = new SceneManager(page);
    await scene.ready();
    const before = await scene.nodeCount();
    await scene.clickNode('scene:root/a');
    expect(await scene.selectedNodes()).toEqual(['scene:root/a']);
    await expect(page.locator('[data-testid="scene-view"] svg rect[style*="cursor"]')).toHaveCount(0);
    const hovered = await scene.box(scene.node('scene:root/a'));
    await page.mouse.move(hovered.x + hovered.width / 2, hovered.y + hovered.height / 2);
    await expect(page.locator('[data-testid="scene-view"] circle.cursor-crosshair')).toHaveCount(0);
    await page.keyboard.press('Delete');
    expect(await scene.nodeCount()).toBe(before);
    // Only the select and pan tools remain, and nothing on the toolbar can change the scene.
    await expect(page.locator('[data-testid="palette"] button')).toHaveCount(2);
    await expect(page.getByTestId('toolbar-create')).toBeDisabled();
    await expect(page.getByTestId('toolbar-delete')).toBeDisabled();
  });
});
