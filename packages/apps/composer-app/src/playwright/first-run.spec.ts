//
// Copyright 2024 DXOS.org
//

// TODO(wittjosiah): Consider using playwright locator expects elsewhere for more robust tests.
import { test, expect } from '@playwright/test';

import { AppManager } from './app-manager';

test.describe('First-run tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init({ dontDismissFirstRun: true });
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
    await host.page.getByTestId('helpPlugin.tooltip.next').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toHaveAttribute('data-step', '5');
    await host.page.getByTestId('helpPlugin.tooltip.finish').click();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).not.toBeVisible();
  });

  test('help plugin tooltip does not display when not first run', async () => {
    await expect(host.page.getByTestId('helpPlugin.tooltip')).toBeVisible();
    await host.page.reload();
    await expect(host.page.getByTestId('helpPlugin.tooltip')).not.toBeVisible();
  });
});
