//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('iframe', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, { url: `${config.baseUrl}/iframe.html` });
    page = result.page;
    await page.locator(':text("value")').waitFor({ state: 'visible' });
  });

  test('parent and child share source of truth.', async () => {
    await expect(page.locator('span:right-of(:text("value"), 10)').first()).not.toContainText('undefined');

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
