//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('iframe-worker', () => {
  let page: Page;
  let close: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, { url: `${config.baseUrl}/iframe-worker.html` });
    page = result.page;
    close = result.close;
    await page.locator(':text("value")').waitFor({ state: 'visible' });
  });

  test.afterAll(async () => {
    // Playwright runs `afterAll` even when `beforeAll` threw, so setup may never have assigned this.
    await close?.();
  });

  test('loads and connects.', async () => {
    await expect(page.frameLocator('#test-iframe').locator('span:right-of(:text("closed"), 10)').first()).toContainText(
      'false',
    );
  });
});
