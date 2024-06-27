//
// Copyright 2024 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

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

  test('help plugin tooltip displays (eventually) on first run and not after refresh', async () => {
    expect(await host.page.getByTestId('helpPlugin.tooltip').isVisible()).to.be.true;
    await host.page.getByTestId('helpPlugin.tooltip.next').click();
    await waitForExpect(async () => {
      await host.page.pause();
      expect(await host.page.getByTestId('helpPlugin.tooltip').getAttribute('data-step')).to.equal('2');
    });
    await host.page.reload();
    expect(await host.page.getByTestId('helpPlugin.tooltip').isVisible({ timeout: 1e3 })).to.be.false;
  });
});
