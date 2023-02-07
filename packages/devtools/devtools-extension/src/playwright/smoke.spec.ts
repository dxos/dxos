//
// Copyright 2023 DXOS.org
//

import { test, expect } from './fixtures';

test.describe('Popup', () => {
  test('our extension loads', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.locator('body')).toHaveText('my-extension popup');
  });
});
