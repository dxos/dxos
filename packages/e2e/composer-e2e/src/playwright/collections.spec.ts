//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';

test.describe('Collection tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('create collection', { tag: ['@QA-1'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection' });
    await host.expandSection('spacePlugin.collectionsSection');
    await expect(host.getObjectByName('New collection')).toHaveCount(1);
  });

  test.describe(() => {
    test.skip(
      ({ browserName }) => browserName !== 'chromium',
      'TODO(thure): Issue #7387: Firefox/Webkit is unable to click on the item actions menu, only in CI.',
    );

    test('re-order collections', { tag: ['@QA-6'] }, async () => {
      await host.createSpace();
      await host.createObject({ type: 'Collection' });
      await host.createObject({ type: 'Collection' });
      await host.expandSection('spacePlugin.collectionsSection');
      await host.renameObject('Collection 1', 0);
      await host.renameObject('Collection 2', 1);

      // Items are 32px tall.
      await host.dragTo(host.getObjectByName('Collection 2'), host.getObjectByName('Collection 1'), {
        instruction: 'reorder-above',
        offset: { x: 0, y: -15 },
      });

      // Folders are now in reverse order.
      await expect(host.getObject(0)).toContainText('Collection 2');
      await expect(host.getObject(1)).toContainText('Collection 1');
    });
  });

  for (let i = 0; i < 10; i++)
    test(`drag object into collection ${i}`, { tag: ['@QA-6'] }, async () => {
      await host.createSpace();
      await host.createObject({ type: 'Collection' });
      await host.createObject({ type: 'Collection' });
      await host.expandSection('spacePlugin.collectionsSection');
      await host.renameObject('Collection 1', 0);
      await host.renameObject('Collection 2', 1);

      // Selected first: an unvisited collection takes the drop beside it rather than inside it.
      await host.getObject(1).click();
      // A row's `data-object-id` is the object's canonical graph path, so once Collection 1 is inside
      // Collection 2 its path is Collection 2's path plus its own id.
      const collection1 = await host.getObjectByName('Collection 1').getAttribute('data-object-id');
      const collection2 = await host.getObjectByName('Collection 2').getAttribute('data-object-id');
      const moved = `${collection2}/${collection1?.split('/').at(-1)}`;
      await host.dragTo(host.getObjectByName('Collection 1'), host.getObjectByName('Collection 2'), {
        instruction: 'make-child',
      });
      // Collection 2 had no children when the drag began, so the drop does not open it.
      await host.expandCollection(0);
      await expect(host.getObjectLinks().and(host.page.locator(`[data-object-id="${moved}"]`))).toHaveCount(1);
    });

  test('delete a collection', { tag: ['@QA-6'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection' });
    await host.expandSection('spacePlugin.collectionsSection');
    // Create an item inside the collection, then disclose it — a childless collection has no toggle.
    await host.createObject({ type: 'Collection', nth: 0 });
    await host.expandCollection(0);
    await expect(host.getObjectLinks()).toHaveCount(2);

    // Delete the containing collection.
    await host.deleteObject(0);
    await expect(host.getObjectLinks()).toHaveCount(0);
  });

  test('deletion undo restores collection', { tag: ['@QA-2', '@QA-6'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection' });
    await host.expandSection('spacePlugin.collectionsSection');
    // Create a collection inside the collection, then disclose it.
    await host.createObject({ type: 'Collection', nth: 0 });
    await host.expandCollection(0);
    // Create an item inside the contained collection.
    await host.createObject({ type: 'Collection', nth: 1 });
    await host.expandCollection(1);
    await expect(host.getObjectLinks()).toHaveCount(3);

    // Delete the containing collection.
    await host.deleteObject(0);
    await expect(host.getObjectLinks()).toHaveCount(0);

    // Undo the deletion.
    await host.toastAction(0);

    await expect(host.getObjectLinks()).toHaveCount(3);
  });
});
