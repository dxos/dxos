//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import type { Page } from 'playwright';

import { beforeAll, describe, setupPage, test } from '@dxos/test';

const config = {
  baseUrl: 'http://localhost:5173'
};

describe('multi-worker', () => {
  let page: Page;

  beforeAll(async function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
    if (mochaExecutor.environment === 'firefox') {
      return;
    }

    const result = await setupPage(this, {
      url: `${config.baseUrl}/multi-worker.html`,
      waitFor: (page) => page.isVisible(':has-text("value")')
    });

    page = result.page;
  });

  test('loads and connects.', async () => {
    const isVisible = await page.isVisible(':has-text("value")');
    expect(isVisible).to.be.true;
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687

  test('communicates over multiple independent rpc ports.', async () => {
    const a = await page.locator('[data-testid="dxos:channel-one"] >> p:right-of(:text("value"), 10)').textContent();
    const b = await page.locator('[data-testid="dxos:channel-two"] >> p:right-of(:text("value"), 10)').textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).to.be.greaterThanOrEqual(10000);
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
});
