//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: `${config.baseUrl}/worker.html`,
      waitFor: (page) => page.isVisible(':has-text("value")'),
    });

    page = result.page;
  });

  test('loads and connects.', async () => {
    await expect(page.locator(':text("value")')).toBeVisible();
  });
});
