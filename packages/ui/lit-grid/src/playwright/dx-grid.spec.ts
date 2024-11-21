//
// Copyright 2021 DXOS.org
//

import { expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

test.describe('dx-grid', () => {
  test('virtualization & panning', async ({ browser }) => {
    const { page } = await setupPage(browser, {
      url: storybookUrl('dx-grid--spec'),
      viewportSize: { width: 32 * 10.5, height: 32 * 8.5 }, // 336 x 272
    });

    await page.locator('.dx-grid').waitFor({ state: 'visible' });

    await expect(await page.locator('.dx-grid [data-dx-grid-plane]').all()).toHaveLength(9);

    await page.close();
  });
});
