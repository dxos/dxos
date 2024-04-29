//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

// NOTE: Object 0 is the README.
// NOTE: Reduce flakiness in CI by using waitForExpect.
test.describe('Collection tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create collection', async () => {
    await host.createSpace();
    await host.createCollection();
    await waitForExpect(async () => {
      expect((await host.getObject(1).innerText()).trim()).to.equal('New collection');
    });
  });

  test('re-order collections', async () => {
    await host.createSpace();
    await host.createCollection(1);
    await host.createCollection(1);
    await host.renameObject('Collection 1', 1);
    await host.renameObject('Collection 2', 2);
    await host.toggleCollectionCollapsed(1);
    await host.toggleCollectionCollapsed(2);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('Collection 2').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('Collection 1').hover();
    await host.page.mouse.up();

    // Folders are now in reverse order.
    await waitForExpect(async () => {
      expect((await host.getObject(1).innerText()).trim()).to.equal('Collection 2');
      expect((await host.getObject(2).innerText()).trim()).to.equal('Collection 1');
    });
  });

  test('drag object into collection', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin', 1);
    await host.createCollection(1);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('New document').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('New collection').hover();
    await host.page.mouse.up();

    // Document is now inside the collection.
    await waitForExpect(async () => {
      const collection = await host.getObjectByName('New collection');
      expect((await collection.getByTestId('spacePlugin.object').innerText()).trim()).to.equal('New document');
    });
  });

  test.describe('deleting collection', () => {
    test('moves item out of collection', async () => {
      await host.createSpace();
      await host.createCollection();
      // Create an item inside the collection.
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(3);
      });

      // Delete the containing collection.
      await host.deleteObject(1);
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });

    test('moves collection with item out of collection', async () => {
      await host.createSpace();
      await host.createCollection();
      // Create a collection inside the collection.
      await host.createCollection();
      // Create an item inside the contained collection.
      await host.createObject('markdownPlugin');
      // Reduce flakiness in CI by waiting.
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(4);
      });

      // Delete the containing collection.
      await host.deleteObject(1);
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(3);
      });
    });
  });
});
