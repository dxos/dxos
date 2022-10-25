//
// Copyright 2020 DXOS.org
//

import { BrowserContext, chromium, Page } from 'playwright';
import { v4 } from 'uuid';

import { getExtensionId } from '../utils/extensionId';

const EXTENSION_PATH = `${process.cwd()}/dist`;

describe('Playwright tests for Wallet Extension', function () {
  this.timeout(30000);
  this.retries(1);
  let context: BrowserContext;
  let page: Page;

  before(async function () {
    const userDataDir = `/tmp/browser-mocha/${v4()}`;
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions do not work in headless mode.
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`]
    });
    page = await context.newPage();
  });

  it('Installs properly', async function () {
    await page.goto(`chrome-extension://${await getExtensionId()}/popup/fullscreen.html`);
    await page.waitForSelector("//*[contains(text(),'Welcome to DXOS')]");
  });

  after(async function () {
    await page.close();
    await context.close();
  });
});
