//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

const config = {
  baseUrl: 'http://127.0.0.1:5173/'
};

test.describe('worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${config.baseUrl}/worker.html`);
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).toBeTruthy();
    });
  });
});
