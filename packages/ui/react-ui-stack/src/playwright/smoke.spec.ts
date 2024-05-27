//
// Copyright 2021 DXOS.org
//

import { expect, test } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

import { setupPage } from '@dxos/test/playwright';

import { StackManager } from '../testing';

// TODO(wittjosiah): Factor out.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

test.describe('Stack', () => {
  test('remove', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('react-ui-stack-stack--transfer'),
      waitFor: (page) => page.getByTestId('stack-transfer').isVisible(),
    });

    const stack = new StackManager(page.getByTestId('stack-1'));
    expect(await stack.length()).toEqual(8);

    await stack.section(0).remove();
    expect(await stack.length()).toEqual(7);
  });

  test('re-order', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('react-ui-stack-stack--transfer'),
      waitFor: (page) => page.getByTestId('stack-transfer').isVisible(),
    });

    const stack = new StackManager(page.getByTestId('stack-1'));
    const sectionText = await stack.section(0).locator.innerText();
    await stack.section(0).dragTo(stack.section(2).locator);
    expect(await stack.section(2).locator.innerText()).toEqual(sectionText);
  });

  test('transfer', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('react-ui-stack-stack--transfer'),
      waitFor: (page) => page.getByTestId('stack-transfer').isVisible(),
    });

    const stack1 = new StackManager(page.getByTestId('stack-1'));
    const stack2 = new StackManager(page.getByTestId('stack-2'));

    expect(await stack1.length()).toEqual(8);
    expect(await stack2.length()).toEqual(8);

    const sectionText = await stack1.section(0).locator.innerText();
    await stack1.section(0).dragTo(stack2.section(2).locator);

    expect(await stack1.length()).toEqual(7);
    expect(await stack2.length()).toEqual(9);
    expect(await stack2.section(2).locator.innerText()).toEqual(sectionText);
  });

  test('copy', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('react-ui-stack-stack--copy'),
      waitFor: (page) => page.getByTestId('stack-copy').isVisible(),
    });

    const stack1 = new StackManager(page.getByTestId('stack-1'));
    const stack2 = new StackManager(page.getByTestId('stack-2'));

    expect(await stack1.length()).toEqual(8);
    expect(await stack2.isEmpty()).toEqual(true);

    const sectionText = await stack1.section(0).locator.innerText();
    await stack1.section(0).dragTo(stack2.locator.getByTestId('stack.empty'));

    await waitForExpect(async () => {
      expect(await stack1.length()).toEqual(8);
    });
    expect(await stack2.isEmpty()).toEqual(false);
    expect(await stack2.length()).toEqual(1);
    expect(await stack2.section(0).locator.innerText()).toEqual(sectionText);
  });
});
