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

  test('drag object into collection', { tag: ['@QA-6'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection' });
    await host.createObject({ type: 'Collection' });
    await host.expandSection('spacePlugin.collectionsSection');
    await host.renameObject('Collection 1', 0);
    await host.renameObject('Collection 2', 1);

    const collection1Path = await host.getObjectByName('Collection 1').getAttribute('data-object-id');
    const collection2Path = await host.getObjectByName('Collection 2').getAttribute('data-object-id');
    if (!collection1Path || !collection2Path) {
      throw new Error('collection rows have no data-object-id');
    }
    const collection1InCollection2Path = `${collection2Path}/${collection1Path.split('/').at(-1)}`;
    await host.dragInto(host.getObjectByName('Collection 1'), host.getObjectByName('Collection 2'));
    await expect(
      host.getObjectLinks().and(host.page.locator(`[data-object-id="${collection1InCollection2Path}"]`)),
    ).toHaveCount(1);
    await expect(host.getObjectByName('Collection 1')).toHaveCount(1);
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
