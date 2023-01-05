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

describe('iframe', () => {
  let page: Page;

  beforeAll(async function () {
    const result = await setupPage(this.browser, `${config.baseUrl}/iframe.html`);
    page = result.page;
  });

  test('loads and connects.', async () => {
    await waitForExpect(async () => {
      const isVisible = await page.isVisible(':has-text("value")');
      expect(isVisible).to.be.true;
    });
  });

  test('parent and child share source of truth.', async () => {
    const a = await page.locator('p:right-of(:text("value"), 10)').textContent();
    const b = await page.frameLocator('#test-iframe').locator('p:right-of(:text("value"), 10)').textContent();
    const [intA, intB] = [a!, b!].map((str) => parseInt(str.slice(1)));

    expect(Math.abs(intA - intB)).to.be.lessThan(50);
  });
});
