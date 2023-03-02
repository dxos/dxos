//
// Copyright 2021 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import { Page } from 'playwright';

import { setupPage } from '@dxos/test/playwright';

// TODO(wittjosiah): Factor out.
// TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

test.describe('Smoke test', () => {
  let page: Page;

  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
  test.beforeAll(async ({ browser }) => {
    const result = await setupPage(browser, {
      url: storybookUrl('client-clientcontext--primary'),
      waitFor: (page) => page.isVisible(':has-text("initialized")')
    });

    page = result.page;
  });

  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async () => {
    const isVisible = await page.isVisible(':has-text("initialized")');
    expect(isVisible).to.be.true;
  });
});
