//
// Copyright 2021 DXOS.org
//

import { test, expect } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

test.describe('Smoke test', () => {
  // TODO(wittjosiah): Renable once singleton client has stable hosted location.
  test.skip('Renders tutorial from descriptor', async ({ page }) => {
    await page.goto('#/__story/stories-client-stories-tsx/Primary');

    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("initialized")');
      expect(isVisible).toBeTruthy();
    });
  });
});
