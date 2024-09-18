//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('multi-worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: `${config.baseUrl}/multi-worker.html`,
      waitFor: (page) => page.isVisible(':has-text("value")'),
    });

    page = result.page;
  });

  test('loads and connects.', async () => {
    await expect(page.locator(':text("value")')).toHaveCount(2);
  });

  test('communicates over multiple independent rpc ports.', async () => {
    const a = await page
      .locator('[data-testid="dxos:channel-one"] >> span:right-of(:text("value"), 10)')
      .first()
      .textContent();
    const b = await page
      .locator('[data-testid="dxos:channel-two"] >> span:right-of(:text("value"), 10)')
      .first()
      .textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeGreaterThanOrEqual(10000);
  });
});
