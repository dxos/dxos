//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import type { Page } from 'playwright';
import waitForExpect from 'wait-for-expect';

import { beforeAll, describe, setupPage, test } from '@dxos/test';

const config = {
  baseUrl: 'http://localhost:5173'
};

describe('iframe-worker', () => {
  let page: Page;

  beforeAll(async function () {
    const result = await setupPage(this.browser, `${config.baseUrl}/iframe-worker.html`);
    page = result.page;
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).to.be.true;
      const isClosed = await page.frameLocator('#test-iframe').locator('p:right-of(:text("closed"), 10)').textContent();
      expect(isClosed).to.eq('false');
    });
  }).skipEnvironments('firefox'); // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
});
