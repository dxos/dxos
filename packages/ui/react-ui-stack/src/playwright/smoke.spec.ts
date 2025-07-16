//
// Copyright 2021 DXOS.org
//

import { expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

import { StackManager } from '../testing';

const PORT = 9003;

// TODO(wittjosiah): Update for new stack.
test.describe.skip('Stack', () => {
  test('remove', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storybookUrl('ui-react-ui-stack-stack--transfer', PORT) });
    await page.getByTestId('stack-transfer').waitFor({ state: 'visible' });

    const stack = new StackManager(page.getByTestId('stack-1'));
    await expect(stack.sections()).toHaveCount(8);

    await stack.section(0).remove();
    await expect(stack.sections()).toHaveCount(7);

    await page.close();
  });

  test('rearrange', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storybookUrl('ui-react-ui-stack-stack--transfer', PORT) });
    await page.getByTestId('stack-transfer').waitFor({ state: 'visible' });

    const stack = new StackManager(page.getByTestId('stack-1'));
    const sectionText = await stack.section(0).locator.innerText();
    await stack.section(0).dragTo(stack.section(2).locator);
    expect(await stack.section(2).locator.innerText()).toEqual(sectionText);

    await page.close();
  });

  test('transfer', async ({ browser, browserName }) => {
    if (browserName !== 'chromium') {
      // TODO(wittjosiah): This test is flaky in Webkit & Firefox.
      test.skip();
    }

    const { page } = await setupPage(browser, { url: storybookUrl('ui-react-ui-stack-stack--transfer', PORT) });
    await page.getByTestId('stack-transfer').waitFor({ state: 'visible' });

    const stack1 = new StackManager(page.getByTestId('stack-1'));
    const stack2 = new StackManager(page.getByTestId('stack-2'));

    await expect(stack1.sections()).toHaveCount(8);
    await expect(stack2.sections()).toHaveCount(8);

    const sectionText = await stack1.section(0).locator.innerText();
    await stack1.section(0).dragTo(stack2.section(2).locator);

    await expect(stack1.sections()).toHaveCount(7);
    await expect(stack2.sections()).toHaveCount(9);
    expect(await stack2.section(2).locator.innerText()).toEqual(sectionText);

    await page.close();
  });

  test('copy', async ({ browser }) => {
    const { page } = await setupPage(browser, { url: storybookUrl('ui-react-ui-stack-stack--copy', PORT) });
    await page.getByTestId('stack-copy').waitFor({ state: 'visible' });

    const stack1 = new StackManager(page.getByTestId('stack-1'));
    const stack2 = new StackManager(page.getByTestId('stack-2'));

    await expect(stack1.sections()).toHaveCount(8);
    await expect(stack2.sections()).toHaveCount(0);

    const sectionText = await stack1.section(0).locator.innerText();
    await stack1.section(0).dragTo(stack2.locator.getByTestId('stack.empty'));

    await expect(stack1.sections()).toHaveCount(8);
    await expect(stack2.sections()).toHaveCount(1);
    expect(await stack2.section(0).locator.innerText()).toEqual(sectionText);

    await page.close();
  });
});
