//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';
import { Markdown, Stack } from './plugins';

test.describe('Stack tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.createCollection(1);
    const stack = Stack.getStack(host.page);
    await waitForExpect(async () => {
      expect(await stack.isEmpty()).to.be.true;
      expect(await host.getObjectsCount()).to.equal(1);
    });
  });

  test('create new document section', async () => {
    await host.createSpace();

    // Close all planks
    await host.planks.closeAll();

    await host.createCollection(1);
    await host.toggleCollectionCollapsed(0);
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    const [collectionPlank] = await host.planks.getPlanks({ filter: 'collection' });
    const textBox = Markdown.getMarkdownTextboxWithLocator(collectionPlank.locator);
    await waitForExpect(async () => {
      expect(await host.getObjectsCount()).to.equal(2);
      expect(await stack.length()).to.equal(1);
      expect(await textBox.isEditable()).to.be.true;
    });
  });

  test('create section from existing document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await host.planks.closeAll();
    await host.createCollection(1);
    const stack = Stack.getStack(host.page);
    const doc = await host.getObjectLinks().nth(0);

    // TODO(wittjosiah): Navtree dnd helpers.
    await host.page.pause();
    await doc.hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await stack.locator.getByTestId('stack.empty').hover();
    await host.page.mouse.up();

    const [collectionPlank] = await host.planks.getPlanks({ filter: 'collection' });
    const textBox = Markdown.getMarkdownTextboxWithLocator(collectionPlank.locator);
    expect(await stack.length()).to.equal(1);
    expect(await textBox.isEditable()).to.be.true;
  });

  test('reorder sections', async () => {
    await host.createSpace();
    await host.planks.closeAll();
    await host.createCollection(1);
    await host.toggleCollectionCollapsed(0);
    await Stack.createSection(host.page, 'markdownPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    await waitForExpect(async () => {
      expect(await host.getObjectsCount()).to.equal(3);
      expect(await stack.length()).to.equal(2);
    });

    const originalOrder = await stack.order();
    await stack.section(0).dragTo(stack.section(1).locator);
    const newOrder = await stack.order();
    expect(originalOrder[1]).to.equal(newOrder[0]);
  });
});
