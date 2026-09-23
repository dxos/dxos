//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { SceneManager } from './SceneManager.ts';

const PORT = 9006;
// The empty canvas: every gesture here lands on blank scene, so a create is never a hit on a fixture node.
const DEFAULT_URL = storybookUrl('ui-react-ui-canvas-scene-sceneview--default', PORT);

test.describe('create sizing', () => {
  let page: Page;
  let scene: SceneManager;
  let close: (() => Promise<void>) | undefined;
  let errors: string[];

  test.beforeEach(async ({ browser }) => {
    errors = [];
    ({ page, close } = await setupPage(browser, { url: DEFAULT_URL, viewportSize: { width: 1400, height: 900 } }));
    page.on('pageerror', (error) => errors.push(error.message));
    scene = new SceneManager(page);
    await scene.ready();
    await scene.focus();
  });

  test.afterEach(async () => {
    expect(errors).toEqual([]);
    await close?.();
    close = undefined;
  });

  const ids = () =>
    page.locator('[data-node-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-node-id') ?? ''));

  /** The node a gesture adds, if any. */
  const added = async (gesture: () => Promise<void>): Promise<string | undefined> => {
    const before = new Set(await ids());
    await gesture();
    await page.waitForTimeout(300);
    return (await ids()).find((id) => !before.has(id));
  };

  test('a drawn box is the size the pointer swept, and a drag that moved nothing creates nothing', async () => {
    const drawn = await added(async () => {
      await page.keyboard.press('r');
      await scene.drag({ x: 380, y: 640 }, { x: 620, y: 800 });
    });
    expect(drawn).toBeDefined();
    const box = await scene.box(scene.node(drawn!));
    // Both ends snap to the grid, so each axis can land a cell either side of what the pointer swept —
    // but it tracks the pointer rather than falling back to the type's default, whose 2:1 shape a
    // 240x160 sweep would not produce. The cell is read against the live zoom: the story fits itself to
    // the viewport, so a hard-coded percentage is a local accident.
    const cell = (64 * (await scene.zoom())) / 100;
    expect(Math.abs(box.width - 240)).toBeLessThan(cell);
    expect(Math.abs(box.height - 160)).toBeLessThan(cell);

    // A press that never moved snaps to a zero box: nothing is created, rather than a default-sized node
    // planted under the click.
    const clicked = await added(async () => {
      await page.keyboard.press('r');
      await scene.drag({ x: 1000, y: 640 }, { x: 1000, y: 640 });
    });
    expect(clicked).toBeUndefined();
  });

  test('a move snaps to the grid the user can see, however far the view is zoomed out', async () => {
    const id = await added(async () => {
      await page.keyboard.press('r');
      await scene.drag({ x: 380, y: 640 }, { x: 620, y: 800 });
    });
    expect(id).toBeDefined();

    // Zoom out until the finest level fixed in scene units would no longer be drawn: a snap to it would
    // then move the node by less than a screen pixel, which reads as no snapping at all.
    await scene.zoomOut(6);

    const before = await scene.box(scene.node(id!));
    // Nudge by a few pixels: with snapping live the node must land on a line, so it either stays put or
    // jumps a whole visible cell — never drifts by the few pixels the pointer moved.
    const from = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
    await scene.drag(from, { x: from.x + 5, y: from.y });
    const after = await scene.box(scene.node(id!));
    // A snapped move lands a whole visible cell away or not at all; the cell is derived from the zoom
    // this many steps out, never assumed.
    const cell = (64 * (await scene.zoom())) / 100;
    const moved = Math.abs(after.x - before.x);
    expect(moved === 0 || moved > cell / 2).toBe(true);
  });

  test('a toolbar create covers the same screen area whatever the zoom', async () => {
    const createFromToolbar = async () => {
      await page.getByTestId('toolbar-create').click();
      await page.getByRole('menuitem').first().click();
    };
    const widthAt = async (): Promise<number> => {
      const id = await added(createFromToolbar);
      expect(id).toBeDefined();
      return (await scene.box(scene.node(id!))).width;
    };

    const initial = await widthAt();
    await scene.zoomIn(2);
    const zoomedIn = await widthAt();
    await scene.zoomOut(4);
    const zoomedOut = await widthAt();

    // The default size is expressed in scene units, so without scaling by the zoom these would differ by
    // the zoom ratio (over 2x across this range). Snapping to the grid leaves a cell of slack.
    for (const width of [zoomedIn, zoomedOut]) {
      expect(Math.abs(width - initial)).toBeLessThan(60);
    }
  });
});
