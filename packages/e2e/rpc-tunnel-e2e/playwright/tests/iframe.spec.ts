//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import { default as waitForExpect } from 'wait-for-expect';

const config = {
  baseUrl: 'http://localhost:5173'
};

test.describe('iframe', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${config.baseUrl}/iframe.html`);
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).toBeTruthy();
    });
  });

  test('parent and child share source of truth.', async () => {
    const a = await page.locator('p:right-of(:text("value"), 10)').textContent();
    const b = await page.frameLocator('#test-iframe').locator('p:right-of(:text("value"), 10)').textContent();
    const [intA, intB] = [a!, b!].map(str => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeLessThan(50);
  });
});
