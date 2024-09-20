//
// Copyright 2022 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

const config = {
  baseUrl: 'http://localhost:5173',
};

test.describe('multi-worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, { url: `${config.baseUrl}/multi-worker.html` });
    page = result.page;
  });

  test('communicates over multiple independent rpc ports.', async () => {
    const locator = (channel: string) =>
      page.locator(`[data-testid="dxos:${channel}"] >> span:right-of(:text("value"), 10)`).first();
    await expect(locator('channel-one')).not.toContainText('undefined');
    const a = await locator('channel-one').textContent();
    const b = await locator('channel-two').textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeGreaterThanOrEqual(10000);
  });
});
