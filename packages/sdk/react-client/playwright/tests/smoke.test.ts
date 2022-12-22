//
// Copyright 2021 DXOS.org
//

import { test, expect } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

test.describe('Smoke test', () => {
  // NOTE: This test depends on connecting to the default production deployed HALO vault.
  test('Renders remote client info', async ({ page }) => {
    await page.goto('http://localhost:9009/iframe.html?id=react-client-clientcontext--primary&viewMode=story');

    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("initialized")');
      expect(isVisible).toBeTruthy();
    }, 15_000); // It takes the storybook a minute to boot up.
  });
});
