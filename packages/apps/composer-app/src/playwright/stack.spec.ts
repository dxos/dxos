//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

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
    await expect(stack.empty()).toBeVisible();
    await expect(host.getObjectLinks()).toHaveCount(1);
  });

  test('create new document section', async () => {
    await host.createSpace();

    // Close all planks
    await host.deck.closeAll();

    await host.createCollection(1);
    await host.toggleCollectionCollapsed(0);
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await expect(host.getObjectLinks()).toHaveCount(2);
    await expect(stack.sections()).toHaveCount(1);
    await expect(textBox).toBeEditable();
  });

  test('create section from existing document', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    await host.deck.closeAll();
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

    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);
    await expect(stack.sections()).toHaveCount(1);
    await expect(textBox).toBeEditable();
  });

  test('reorder sections', async () => {
    await host.createSpace();
    await host.deck.closeAll();
    await host.createCollection(1);
    await host.toggleCollectionCollapsed(0);
    await Stack.createSection(host.page, 'markdownPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    await expect(host.getObjectLinks()).toHaveCount(3);
    await expect(stack.sections()).toHaveCount(2);

    const originalOrder = await stack.order();
    await stack.section(0).dragTo(stack.section(1).locator);
    const newOrder = await stack.order();
    expect(originalOrder[1]).toEqual(newOrder[0]);
  });
});
