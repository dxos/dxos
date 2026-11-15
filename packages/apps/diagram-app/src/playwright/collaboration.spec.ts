//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { DiagramApp, INVITATION_PARAM } from './diagram-app.ts';

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
});
