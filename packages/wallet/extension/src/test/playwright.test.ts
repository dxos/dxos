/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { BrowserContext, chromium, Page, Browser } from 'playwright';

describe('Playwright tests for Wallet Extension', async function () {
  this.timeout(30000);
  this.retries(1);
  let browser: Browser
  let context: BrowserContext
  let page: Page

  before(async() => {
    browser = await chromium.launch({headless: !!process.env.CI})
    context = await browser.newContext();
    page = await context.newPage();
  })

  it('Installs properly', async () => {
    await page.goto('http://google.pl')
  })

  after(async() => {

  })
});
