/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { BrowserContext, chromium, Page } from 'playwright';
import { v4 } from 'uuid';

const EXTENSION_PATH = `${process.cwd()}/dist`;
const EXTENSION_ID = 'nlblcnolkmdjhafclifedafnifbcmpph'; // TODO(rzadp): When will this change?

describe('Playwright tests for Wallet Extension', function () {
  this.timeout(30000);
  this.retries(1);
  let context: BrowserContext;
  let page: Page;

  before(async () => {
    const userDataDir = `${process.cwd()}/src/test/temp/${v4()}`;
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: !!process.env.CI,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`
      ]
    });
    page = await context.newPage();
  });

  it('Installs properly', async () => {
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup/fullscreen.html`);
    await page.waitForSelector("//*[contains(text(),'Welcome to DXOS')]");
  });

  after(async () => {
    await page.close();
    await context.close();
  });
});
