//
// Copyright 2024 DXOS.org
//

// TODO(wittjosiah): Consider using playwright locator expects elsewhere for more robust tests.
import { test, expect } from '@playwright/test';

import { AppManager } from './app-manager';

// TODO(wittjosiah): These are skipped because trigger for joyride is currently part of beta auth flow.
test.describe.skip('First-run tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('help plugin tooltip displays (eventually) on first run and increments correctly', async () => {
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toBeVisible();
    await host.page.getByTestId('helpPlugin.tooltip.next').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toHaveAttribute('data-step', '2');
    await host.page.getByTestId('helpPlugin.tooltip.next').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toHaveAttribute('data-step', '3');
    await host.page.getByTestId('helpPlugin.tooltip.next').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toHaveAttribute('data-step', '4');
    await host.page.getByTestId('helpPlugin.tooltip.finish').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).not.toBeVisible();
  });

  test('help plugin tooltip does not display when not first run', async () => {
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toBeVisible();
    await host.page.reload();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).not.toBeVisible();
  });
});
