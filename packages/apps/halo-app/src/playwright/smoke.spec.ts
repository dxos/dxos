//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import { Page } from '@playwright/test';

import { setupPage } from '@dxos/test/playwright';

test.describe('Smoke test', () => {
  let page: Page;

  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
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
