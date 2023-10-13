//
// Copyright 2023 DXOS.org
//

import { test, type Page } from '@playwright/test';
import { expect } from 'chai';

import { setupPage } from '@dxos/test/playwright';

test.describe('Smoke test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: 'http://localhost:3967',
      waitFor: async (page) => page.isVisible(':has-text("HALO")'),
    });

    page = result.page;
  });

  test('connects to shared worker', async () => {
    const isVisible = await page.isVisible(':has-text("HALO")');
    expect(isVisible).to.be.true;
  });
});
