//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

// NOTE: Object 0 is the README.
// NOTE: Reduce flakiness in CI by using waitForExpect.
test.describe('Folder tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create folder', async () => {
    await host.createSpace();
    await host.createFolder();
    await waitForExpect(async () => {
      expect((await host.getObject(1).innerText()).trim()).to.equal('New folder');
    });
  });

  test('re-order folders', async () => {
    await host.createSpace();
    await host.createFolder(1);
    await host.createFolder(1);
    await host.renameObject('Folder 1', 1);
    await host.renameObject('Folder 2', 2);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('Folder 2').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('Folder 1').hover();
    await host.page.mouse.up();

    // Folders are now in reverse order.
    await waitForExpect(async () => {
      expect((await host.getObject(1).innerText()).trim()).to.equal('Folder 2');
      expect((await host.getObject(2).innerText()).trim()).to.equal('Folder 1');
    });
  });

  test('drag object into folder', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin', 1);
    await host.createFolder(1);
    await host.toggleFolderCollapsed(2);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.getObjectByName('New document').hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await host.getObjectByName('New folder').hover();
    await host.page.mouse.up();

    // Document is now inside the folder.
    await waitForExpect(async () => {
      const folder = await host.getObjectByName('New folder');
      expect((await folder.getByTestId('spacePlugin.object').innerText()).trim()).to.equal('New document');
    });
  });

  test.describe('deleting folder', () => {
    test('moves item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // Create an item inside the folder.
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(3);
      });

      // Delete the containing folder.
      await host.deleteObject(1);
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });

    test('moves folder with item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // Create a folder inside the folder.
      await host.createFolder();
      // Create an item inside the contained folder.
      await host.createObject('markdownPlugin');
      // Reduce flakiness in CI by waiting.
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(4);
      });

      // Delete the containing folder.
      await host.deleteObject(1);
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(3);
      });
    });
  });
});
