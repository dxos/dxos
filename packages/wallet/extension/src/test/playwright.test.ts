/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { v4 } from 'uuid';
import { BrowserContext, chromium, Page, Browser } from 'playwright';

const EXTENSION_PATH = `${process.cwd()}/dist`

describe('Playwright tests for Wallet Extension', async function () {
  this.timeout(30000);
  this.retries(1);
  let context: BrowserContext
  let page: Page
  let userDataDir: string

  before(async() => {
    const userDataDir = `${process.cwd()}/src/test/temp/${v4()}`
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: !!process.env.CI,
      args: [
        '--enable-remote-extensions',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ]
    })
    page = await context.newPage();
  })

  it('Installs properly', async () => {
    await page.goto('chrome://extensions/')
  })

  after(async() => {

  })
});
