//
// Copyright 2021 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

// TODO(wittjosiah): Factor out.
// TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

test.describe('Smoke test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, { url: storybookUrl('react-client-withclientprovider--default') });
    page = result.page;
    await page.locator(':text("initialized")').waitFor({ state: 'visible' });
  });

  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async () => {
    await expect(page.locator(':text("initialized")')).toBeVisible();
  });
});
