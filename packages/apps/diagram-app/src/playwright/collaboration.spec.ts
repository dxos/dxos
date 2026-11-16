//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { DiagramApp, INVITATION_PARAM, type ShapeInView } from './diagram-app.ts';

/** Whether two views show the scene alike: the same shape at the same place and size, to a pixel or two. */
const sameView = (a?: ShapeInView, b?: ShapeInView): boolean =>
  !!a && !!b && Math.abs(a.dx - b.dx) < 2 && Math.abs(a.dy - b.dy) < 2 && Math.abs(a.width - b.width) < 2;

// The service worker breaks routing and interception.
if (process.env.DX_PWA !== 'false') {
  throw new Error('run with DX_PWA=false');
}

test.describe('Collaboration', () => {
  let ada: DiagramApp;
  let ben: DiagramApp;

  test.beforeEach(async ({ browser }) => {
    ada = new DiagramApp(browser);
    ben = new DiagramApp(browser);
  });

  test.afterEach(async () => {
    await Promise.all([ada.close(), ben.close()]);
  });

  test('two people draw together', { tag: ['@QA-6'] }, async () => {
    await test.step('Ada draws', async () => {
      await ada.open();
      await expect(ada.pill()).toContainText('My diagrams');
      await expect(ada.pill()).toContainText('Untitled');
      await ada.draw('node:rect', { x: 450, y: 250 }, { x: 650, y: 400 });
      await expect(ada.shapes()).toHaveCount(1);
    });

    let link = '';
    await test.step('Ada shares', async () => {
      const shared = await ada.share();
      link = shared.link;
      await expect(shared.dialog.getByTestId('space-members-list')).toBeVisible();
      await expect(shared.dialog.getByTestId('copy-invitation')).toHaveCount(1);
      expect(new URL(link).searchParams.has(INVITATION_PARAM)).toBe(true);
      await ada.closeDialog();
    });

    await test.step('Ben joins', async () => {
      await ben.open(link);
      await expect(ben.toolbar()).toBeVisible({ timeout: 90_000 });
      await expect.poll(() => ben.path()).toBe(ada.path());
      await expect(ben.shapes()).toHaveCount(1);
      await ben.openSpaceMenu();
      await expect(ben.spaceEntries()).toHaveCount(1);
      await expect(ben.spaceEntries()).toContainText('My diagrams');
      await ben.closeMenu();
    });

    await test.step('Presence', async () => {
      // Viewers announce themselves on an interval, so this can take most of a minute.
      await expect(ada.presence()).toHaveCount(1, { timeout: 60_000 });
      await expect(ben.presence()).toHaveCount(1, { timeout: 60_000 });
    });

    await test.step('Cursors', async () => {
      // A pointer posted before the peers connect is lost, so keep moving until one lands.
      let step = 0;
      await expect
        .poll(
          async () => {
            await ben.hover(step++);
            return ada.remoteCursors().count();
          },
          { timeout: 30_000, intervals: [1_000] },
        )
        .toBe(1);
      await expect(ada.remoteCursors()).toHaveText(/.+/);
    });

    await test.step('Ben draws', async () => {
      await ben.draw('node:ellipse', { x: 500, y: 470 }, { x: 640, y: 580 });
      await expect(ben.shapes()).toHaveCount(2);
      await expect(ada.shapes()).toHaveCount(2);
    });

    await test.step('Ada adds a diagram', async () => {
      await ada.createDiagram('Roadmap');
      await expect(ada.pill()).toContainText('Roadmap');
      await ben.openDiagramMenu();
      await expect(ben.diagramEntries()).toHaveCount(2);
      for (const name of ['Untitled', 'Roadmap']) {
        await expect(ben.diagramEntries().filter({ hasText: name })).toHaveCount(1);
      }
      await ben.closeMenu();
    });
  });
  test('follow a collaborator', { tag: ['@QA-7'] }, async () => {
    await test.step('Ada and Ben share a space', async () => {
      await ada.open();
      await ada.draw('node:rect', { x: 450, y: 250 }, { x: 650, y: 400 });
      const { link } = await ada.share();
      await ada.closeDialog();
      await ben.open(link);
      await expect(ben.toolbar()).toBeVisible({ timeout: 90_000 });
      await expect(ada.presence()).toHaveCount(1, { timeout: 60_000 });
      await expect(ben.presence()).toHaveCount(1, { timeout: 60_000 });
      await ada.createDiagram('Roadmap');
      await expect(ada.pill()).toContainText('Roadmap');
      await ada.draw('node:rect', { x: 500, y: 300 }, { x: 600, y: 380 });
    });

    await test.step('Ben follows Ada', async () => {
      await ben.follow();
      await expect.poll(() => ben.path(), { timeout: 20_000 }).toBe(ada.path());
      await expect.poll(() => ben.accent()).toBe('amber');
      await expect.poll(() => ada.accent(), { timeout: 20_000 }).toBe('amber');
    });

    await test.step('Ada moves', async () => {
      await ada.zoomAndPan({ x: 550, y: 340 }, { x: 150, y: 80 });
      await expect
        .poll(async () => sameView(await ada.shapeInView(), await ben.shapeInView()), { timeout: 10_000 })
        .toBe(true);
    });

    await test.step('Ada switches diagram', async () => {
      await ada.openDiagram('Untitled');
      await expect(ada.pill()).toContainText('Untitled');
      await expect.poll(() => ben.path(), { timeout: 20_000 }).toBe(ada.path());
    });

    await test.step('Ben stops', async () => {
      await ben.stopFollowing();
      await expect.poll(() => ben.accent()).toBeNull();
      await expect.poll(() => ada.accent(), { timeout: 20_000 }).toBeNull();
      const before = await ben.shapeInView();
      const path = ben.path();
      await ada.zoomAndPan({ x: 550, y: 320 }, { x: -100, y: 40 });
      await expect.poll(() => ada.shapeInView()).not.toEqual(before);
      // Ada's view and her next diagram travel in one location stream: once Ben sees her leave, he has had the pan.
      await ada.openDiagram('Roadmap');
      await expect(ben.presence()).toHaveCount(0, { timeout: 20_000 });
      expect(ben.path()).toBe(path);
      expect(await ben.shapeInView()).toEqual(before);
    });
  });
});
