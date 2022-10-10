
//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import { default as waitForExpect } from 'wait-for-expect';

const config = {
  baseUrl: 'http://localhost:5173'
};

test.describe('worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${config.baseUrl}/iframe-worker.html`);
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).toBeTruthy();
      const isClosed = await page.frameLocator('#test-iframe').locator('p:right-of(:text("closed"), 10)').textContent();
      expect(isClosed).toEqual('false');
    });
  });
});
