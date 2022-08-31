//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';

const config = {
  baseUrl: 'http://localhost:5173/'
};

test.describe('Single window', () => {
  test('loads iframe and connects.', async ({ page }) => {
    await page.goto(config.baseUrl);

    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).toBeTruthy();
    });
  });
});

test.describe('Multiple windows', () => {
  let pageA: Page;
  let pageB: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();

    [pageA, pageB] = await Promise.all([
      context.newPage(),
      context.newPage()
    ]);

    await pageA.goto(config.baseUrl);
    await sleep(1000);
    await pageB.goto(config.baseUrl);
  });

  test('load iframe and connect.', async () => {
    await waitForExpect(async () => {
      const isVisible =
        await pageA.isVisible(':has-text("value")') &&
        await pageB.isVisible(':has-text("value")');

      expect(isVisible).toBeTruthy();
    });
  });

  test('all windows share source of truth.', async () => {
    const a = await pageA.locator('p:right-of(:text("value"), 10)').textContent();
    const b = await pageB.locator('p:right-of(:text("value"), 10)').textContent();
    const [intA, intB] = [a!, b!].map(str => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).toBeLessThan(50);
  });

  // TODO(wittjosiah): Fix.
  test.skip('transfer provider when window closes.', async () => {
    await pageA.close();
    const x = await pageB.locator('p:right-of(:text("value"), 10)').textContent();
    await sleep(100);
    const y = await pageB.locator('p:right-of(:text("value"), 10)').textContent();
    const [intX, intY] = [x!, y!].map(str => parseInt(str.slice(1)));

    expect(Math.abs(intX - intY)).toBeGreaterThan(0);
  });
});
