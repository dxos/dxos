//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Page } from 'playwright';

import { beforeAll, describe, setupPage, test } from '@dxos/test';

describe('Smoke test', function () {
  let page: Page;

  beforeAll(async function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
    if (mochaExecutor.environment === 'firefox') {
      return;
    }

    const result = await setupPage(this, {
      url: 'http://localhost:3967',
      waitFor: async (page) => page.isVisible(':has-text("HALO")')
    });

    page = result.page;
  });

  test('connects to shared worker', async () => {
    const isVisible = await page.isVisible(':has-text("HALO")');
    expect(isVisible).to.be.true;
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
});
