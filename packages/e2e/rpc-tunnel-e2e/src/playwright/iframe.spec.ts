//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('iframe', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: `${config.baseUrl}/iframe.html`,
      waitFor: (page) => page.isVisible(':has-text("value")'),
    });

    page = result.page;
  });

  test('loads and connects.', async () => {
    const isVisible = await page.isVisible(':has-text("value")');
    expect(isVisible).toBe(true);
  });

  test('parent and child share source of truth.', async () => {
    const a = await page.locator('span:right-of(:text("value"), 10)').first().textContent();
    const b = await page
      .frameLocator('#test-iframe')
      .locator('span:right-of(:text("value"), 10)')
      .first()
      .textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeLessThan(50);
  });
});
