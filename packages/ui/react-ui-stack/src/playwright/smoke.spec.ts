//
// Copyright 2021 DXOS.org
//

import { test } from '@playwright/test';

import { setupPage } from '@dxos/test/playwright';

// TODO(wittjosiah): Factor out.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

test.describe('Stack', () => {
  test('re-order', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('components-stack--transfer'),
      waitFor: (page) => page.getByTestId('stack-transfer').isVisible(),
    });

    const sectionA = page.getByTestId('stack-1').locator('li').first();
    const sectionB = page.getByTestId('stack-1').locator('li').nth(5);

    // TODO(wittjosiah): This doesn't work.
    // await sectionA.getByTestId('drag-handle').dragTo(sectionB);

    await sectionA.getByTestId('drag-handle').hover();
    await page.mouse.down();
    // TODO(wittjosiah): Removing this causes drag not to happen.
    await page.mouse.move(0, 0);
    await sectionB.hover();
    await page.mouse.up();

    console.log(await page.getByTestId('stack-1').locator('li').nth(5).innerText());
  });
});
