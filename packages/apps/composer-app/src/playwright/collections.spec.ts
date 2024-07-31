//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';

test.describe('Collection tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create collection', async () => {
    await host.createSpace();
    await host.createCollection();
    await expect(host.getObject(0)).toContainText('New collection');
  });

  test('re-order collections', async () => {
    await host.createSpace();
    await host.createCollection(1);
    await host.createCollection(1);
    await host.renameObject('Collection 1', 0);
    await host.renameObject('Collection 2', 1);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('Collection 2').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('Collection 1').hover();
    await host.page.mouse.up();

    // Folders are now in reverse order.
    await expect(host.getObject(0)).toContainText('Collection 2');
    await expect(host.getObject(1)).toContainText('Collection 1');
  });

  test('drag object into collection', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin', 1);
    await host.createCollection(1);
    await host.toggleCollectionCollapsed(1);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('New document').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('New collection').hover();
    await host.page.mouse.up();

    // Document is now inside the collection.
    const collection = await host.getObjectByName('New collection');
    await expect(collection.getByTestId('spacePlugin.object')).toContainText('New document');
  });

  test.describe('deleting collection', () => {
    test('moves item out of collection', async () => {
      await host.createSpace();
      await host.createCollection();
      await host.toggleCollectionCollapsed(0);
      // Create an item inside the collection.
      await host.createObject('markdownPlugin');
      await expect(host.getObjectLinks()).toHaveCount(2);

      // Delete the containing collection.
      await host.deleteObject(0);
      await expect(host.getObjectLinks()).toHaveCount(1);
    });

    test('moves collection with item out of collection', async () => {
      await host.createSpace();
      await host.createCollection();
      await host.toggleCollectionCollapsed(0);
      // Create a collection inside the collection.
      await host.createCollection();
      await host.toggleCollectionCollapsed(1);
      // Create an item inside the contained collection.
      await host.createObject('markdownPlugin');
      await expect(host.getObjectLinks()).toHaveCount(3);

      // Delete the containing collection.
      await host.deleteObject(0);
      await host.toggleCollectionCollapsed(0);
      await expect(host.getObjectLinks()).toHaveCount(2);
    });
  });
});
