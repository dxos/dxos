//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

const config = {
  baseUrl: 'http://localhost:5173'
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

test.describe('multi-worker', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${config.baseUrl}/multi-worker.html`);
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).toBeTruthy();
    });
  });

  test('communicates over multiple independent rpc ports.', async () => {
    const a = await page.locator('[data-testid="dxos:channel-one"] >> p:right-of(:text("value"), 10)').textContent();
    const b = await page.locator('[data-testid="dxos:channel-two"] >> p:right-of(:text("value"), 10)').textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeGreaterThanOrEqual(10000);
  });
});
