//
// Copyright 2022 DXOS.org
//

import { type Page, test } from '@playwright/test';
import { expect } from 'chai';

import { setupPage } from '@dxos/test/playwright';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('iframe-worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: `${config.baseUrl}/iframe-worker.html`,
      waitFor: (page) => page.isVisible(':has-text("value")'),
    });

    page = result.page;
  });

  test('loads and connects.', async () => {
    const isVisible = await page.isVisible(':has-text("value")');
    expect(isVisible).to.be.true;
    const isClosed = await page
      .frameLocator('#test-iframe')
      .locator('span:right-of(:text("closed"), 10)')
      .first()
      .textContent();
    expect(isClosed).to.eq('false');
  });
});
