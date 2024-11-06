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
    await expect(host.getObject(1)).toContainText('New collection');
  });

  test('re-order collections', async ({ browserName }) => {
    // TODO(thure): Issue #7387: Firefox/Webkit is unable to click on the item actions menu, only in CI.
    test.skip(browserName !== 'chromium');

    await host.createSpace();
    await host.createCollection(1);
    await host.createCollection(1);
    await host.renameObject('Collection 1', 1);
    await host.renameObject('Collection 2', 2);

    // Items are 32px tall.
    await host.dragTo(host.getObjectByName('Collection 2'), host.getObjectByName('Collection 1'), { x: 0, y: -15 });

    // Folders are now in reverse order.
    await expect(host.getObject(1)).toContainText('Collection 2');
    await expect(host.getObject(2)).toContainText('Collection 1');
  });

  test('drag object into collection', async ({ browserName }) => {
    // TODO(wittjosiah): This test is quite flaky in webkit.
    test.skip(browserName !== 'chromium');

    await host.createSpace();
    await host.createCollection(1);
    await host.toggleCollectionCollapsed(1);
    await host.dragTo(host.getObjectByName('New document'), host.getObjectByName('New collection'), { x: 0, y: 0 });
    // Document is now inside the collection.
    const docId = await host.getObjectByName('New document').getAttribute('id');
    expect(await host.getObjectByName('New collection').getAttribute('aria-owns')).toEqual(docId);
  });

  test('delete a collection', async () => {
    await host.createSpace();
    await host.createCollection();
    await host.toggleCollectionCollapsed(1);
    // Create an item inside the collection.
    await host.createObject('markdownPlugin');
    await expect(host.getObjectLinks()).toHaveCount(3);

    // Delete the containing collection.
    await host.deleteObject(1);
    await expect(host.getObjectLinks()).toHaveCount(1);
  });

  test('deletion undo restores collection', async () => {
    await host.createSpace();
    await host.createCollection();
    await host.toggleCollectionCollapsed(1);
    // Create a collection inside the collection.
    await host.createCollection();
    await host.toggleCollectionCollapsed(2);
    // Create an item inside the contained collection.
    await host.createObject('markdownPlugin');
    await expect(host.getObjectLinks()).toHaveCount(4);

    // Delete the containing collection.
    await host.deleteObject(1);
    await expect(host.getObjectLinks()).toHaveCount(1);

    // Undo the deletion.
    await host.toastAction(0);

    await expect(host.getObjectLinks()).toHaveCount(4);
  });
});
