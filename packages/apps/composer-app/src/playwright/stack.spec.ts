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

  test('create', async () => {
    await host.createSpace();
    await host.createObject('stackPlugin');
    const stack = Stack.getStack(host.page);
    await waitForExpect(async () => {
      expect(await stack.isEmpty()).to.be.true;
      expect(await host.getObjectsCount()).to.equal(2);
    });
  });

  test('create new document section', async () => {
    await host.createSpace();
    await host.createObject('stackPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    const textBox = await Markdown.getMarkdownTextbox(host.page);
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
    const stack = Stack.getStack(host.page);
    const doc = await host.getObjectLinks().nth(1);

    // TODO(wittjosiah): Navtree dnd helpers.
    await doc.hover();
    await host.page.mouse.down();
    await host.page.mouse.move(0, 0);
    await stack.locator.getByTestId('stack.empty').hover();
    await host.page.mouse.up();

    const textBox = await Markdown.getMarkdownTextbox(host.page);
    expect(await stack.length()).to.equal(1);
    expect(await textBox.isEditable()).to.be.true;
  });

  test('reorder sections', async () => {
    await host.createSpace();
    await host.createObject('stackPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
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
