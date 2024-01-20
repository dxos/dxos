//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';

test.describe('Single-player tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test('create identity, space is created by default', async () => {
    expect(await host.page.getByTestId('spacePlugin.personalSpace').isVisible()).to.be.true;
    expect(await host.page.getByTestId('spacePlugin.sharedSpaces').isVisible()).to.be.true;
    expect(await host.getMarkdownTextbox().textContent()).to.exist;
  });

  test('create space, which is displayed in tree', async () => {
    await host.createSpace();
    await waitForExpect(async () => {
      expect(await host.getSpaceItemsCount()).to.equal(2);
    });
  });

  test('create document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    const textBox = await host.getMarkdownTextbox();
    await waitForExpect(async () => {
      expect(await host.getObjectsCount()).to.equal(2);
      expect(await textBox.isEditable()).to.be.true;
    });
  });

  test('create folder', async () => {
    await host.createSpace();
    await host.createFolder();
    await waitForExpect(async () => {
      expect(await host.getFoldersCount()).to.equal(1);
    });
  });

  test.describe('deleting folders', () => {
    test('moves item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // create an item inside the folder
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
      // delete the containing folder
      await host.deleteObject(0);

      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });

    test('moves folder with item out of folder', async () => {
      await host.createSpace();
      await host.createFolder();
      // create a folder inside the folder
      await host.createFolder();
      // create an item inside the contained folder
      await host.createObject('markdownPlugin');
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
      // delete the containing folder
      await host.deleteObject(0);

      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });
  });

  test.describe('stacks', () => {
    test('create', async () => {
      await host.createSpace();
      await host.createObject('stackPlugin');
      const stack = host.getStack();
      expect(await stack.isEmpty()).to.be.true;
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(2);
      });
    });

    test('create new document section', async () => {
      await host.createSpace();
      await host.createObject('stackPlugin');
      await host.createSection('markdownPlugin');
      const stack = host.getStack();
      const textBox = await host.getMarkdownTextbox();
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(3);
        expect(await stack.length()).to.equal(1);
        expect(await textBox.isEditable()).to.be.true;
      });
    });

    test('create section from existing document', async () => {
      await host.createSpace();
      await host.createObject('markdownPlugin');
      await host.createObject('stackPlugin');
      const stack = host.getStack();
      const doc = await host.getObjectLinks().nth(1);

      // TODO(wittjosiah): Navtree dnd helpers.
      await doc.hover();
      await host.page.mouse.down();
      await host.page.mouse.move(0, 0);
      await stack.locator.getByTestId('stack.empty').hover();
      await host.page.mouse.up();

      const textBox = await host.getMarkdownTextbox();
      expect(await stack.length()).to.equal(1);
      expect(await textBox.isEditable()).to.be.true;
    });

    test('reorder sections', async () => {
      await host.createSpace();
      await host.createObject('stackPlugin');
      await host.createSection('markdownPlugin');
      await host.createSection('markdownPlugin');
      const stack = host.getStack();
      await waitForExpect(async () => {
        expect(await host.getObjectsCount()).to.equal(4);
        expect(await stack.length()).to.equal(2);
      });

      const originalOrder = await stack.order();
      await stack.section(0).dragTo(stack.section(1).locator);
      const newOrder = await stack.order();
      expect(originalOrder[1]).to.equal(newOrder[0]);
    });
  });

  test('error boundary is rendered on invalid storage version', async () => {
    await host.enablePlugin('dxos.org/plugin/debug');
    await host.changeStorageVersionInMetadata(9999);
    expect(await host.page.getByTestId('resetDialog').locator('p').innerText()).to.contain('9999');
    expect(await host.page.getByTestId('resetDialog').locator('h2').innerText()).to.equal('Invalid storage version');
  });
});
