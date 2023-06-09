//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';

import { setupPage } from '@dxos/test/playwright';

test.describe('Smoke test', () => {
  // TODO(wittjosiah): Currently not running in Firefox.
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
  test('connects to shared worker', async ({ browser }) => {
    await setupPage(browser, {
      url: 'http://localhost:5173/src/testing',
      waitFor: async (page) => page.isVisible(':text("Success!")'),
    });
  });
});
