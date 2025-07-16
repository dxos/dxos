//
// Copyright 2021 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage, storybookUrl } from '@dxos/test-utils/playwright';

test.describe('Smoke test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: storybookUrl('sdk-react-client-withclientprovider--default', 9000),
    });
    page = result.page;
    await page.locator(':text("initialized")').waitFor({ state: 'visible' });
  });

  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async () => {
    await expect(page.locator(':text("initialized")')).toBeVisible();
  });
});
