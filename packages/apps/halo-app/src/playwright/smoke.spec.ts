//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Page } from 'playwright';
import waitForExpect from 'wait-for-expect';

import { beforeAll, describe, setupPage, test } from '@dxos/test';

describe('Smoke test', function () {
  let page: Page;

  beforeAll(async function () {
    const result = await setupPage(this.browser, 'http://localhost:3000');
    page = result.page;
  });

  test('connects to shared worker', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("HALO")');
      expect(isVisible).to.be.true;
    });
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
});
