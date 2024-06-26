//
// Copyright 2022 DXOS.org
//

import { type Page, test } from '@playwright/test';
import { expect } from 'chai';

import { setupPage } from '@dxos/test/playwright';

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
    const isVisible = await page.isVisible(':has-text("value")');
    expect(isVisible).to.be.true;
  });
});
