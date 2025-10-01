//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

// TODO(wittjosiah): Importing this causes tests to fail.
// import { StackPlugin } from '@dxos/plugin-stack';

import { AppManager } from './app-manager';
import { INITIAL_OBJECT_COUNT } from './constants';
import { Markdown, Stack, StackPlugin } from './plugins';

test.describe('Stack tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser, browserName }) => {
    // TODO(wittjosiah): For some reason, this fails when running headlessly in webkit.
    test.skip(browserName === 'webkit');

    host = new AppManager(browser, false);
    await host.init();
    // Sleep to allow first run to finish before reloading.
    await host.page.waitForTimeout(500);
    await host.openPluginRegistry();
    await host.openRegistryCategory('recommended');
    await host.enablePlugin(StackPlugin.meta.id);
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection', nth: 0 });
    const stack = Stack.getStack(host.page);
    await expect(stack.sections()).toHaveCount(0);
    await expect(host.getObjectLinks()).toHaveCount(INITIAL_OBJECT_COUNT + 1);
  });

  test('create new document section', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Collection', nth: 0 });
    await host.toggleCollectionCollapsed(INITIAL_OBJECT_COUNT);
    await Stack.createSection(host.page, 'Document');
    const stack = Stack.getStack(host.page);
    const plank = host.deck.plank();
    const textBox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await expect(host.getObjectLinks()).toHaveCount(INITIAL_OBJECT_COUNT + 2);
    await expect(stack.sections()).toHaveCount(1);
    await expect(textBox).toBeEditable();
  });

  // TODO(wittjosiah): This feature has been disabled.
  test.skip('create section from existing document', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document', nth: 0 });
    await host.createObject({ type: 'Collection', nth: 0 });
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
    await host.createObject({ type: 'Collection', nth: 0 });
    await host.toggleCollectionCollapsed(2);
    await Stack.createSection(host.page, 'Document');
    await Stack.createSection(host.page, 'Document');
    const stack = Stack.getStack(host.page);
    await expect(host.getObjectLinks()).toHaveCount(4);
    await expect(stack.sections()).toHaveCount(2);

    const originalOrder = await stack.order();
    await stack.section(0).dragTo(stack.section(1).locator);
    const newOrder = await stack.order();
    expect(originalOrder[1]).toEqual(newOrder[0]);
  });
});
