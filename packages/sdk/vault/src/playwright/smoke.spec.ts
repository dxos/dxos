//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';

import { setupPage } from '@dxos/test/playwright';

test.describe('Smoke test', () => {
  test('connects to shared worker', async ({ browser }) => {
    await setupPage(browser, {
      url: 'http://localhost:5173/src/testing',
      waitFor: async (page) => page.isVisible(':text("Success!")'),
    });
  });
});
