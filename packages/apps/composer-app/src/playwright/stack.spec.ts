//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { sleep } from '@dxos/async';

import { AppManager } from './app-manager';
import { Markdown, Stack } from './plugins';

test.describe('Stack tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
    // Sleep to allow first run to finish before reloading.
    await sleep(500);
    await host.openSettings();
    await host.enablePlugin('dxos.org/plugin/stack');
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection', nth: 1 });
    const stack = Stack.getStack(host.page);
    await expect(stack.sections()).toHaveCount(0);
    await expect(host.getObjectLinks()).toHaveCount(3);
  });

  test('create new document section', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection', nth: 1 });
    await host.toggleCollectionCollapsed(2);
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await expect(host.getObjectLinks()).toHaveCount(4);
    await expect(stack.sections()).toHaveCount(1);
    await expect(textBox).toBeEditable();
  });

  // TODO(wittjosiah): This feature has been disabled.
  test.skip('create section from existing document', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document', nth: 1 });
    await host.createObject({ type: 'Collection', nth: 1 });
    const stack = Stack.getStack(host.page);
    const doc = host.getObjectLinks().nth(1);

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

  // TODO(wittjosiah): This feature has been disabled.
  test.skip('reorder sections', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection', nth: 1 });
    await host.toggleCollectionCollapsed(2);
    await Stack.createSection(host.page, 'markdownPlugin');
    await Stack.createSection(host.page, 'markdownPlugin');
    const stack = Stack.getStack(host.page);
    await expect(host.getObjectLinks()).toHaveCount(5);
    await expect(stack.sections()).toHaveCount(2);

    const originalOrder = await stack.order();
    await stack.section(0).dragTo(stack.section(1).locator);
    const newOrder = await stack.order();
    expect(originalOrder[1]).toEqual(newOrder[0]);
  });
});
