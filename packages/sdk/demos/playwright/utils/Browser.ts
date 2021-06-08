//
// Copyright 2020 DXOS.org
//

import { BrowserType, Browser as PWBrowser, BrowserContext, Page } from "playwright";

const headless = !!process.env.CI;
const slowMo = process.env.CI ? 0 : 200;

export class Browser {
  browser: PWBrowser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;

  async launchBrowser (_browser: BrowserType, _startUrl: string) {
    this.browser = await _browser.launch({ headless, slowMo });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    await this.page.goto(_startUrl, { waitUntil: 'load' });
  }

  async closeBrowser () {
    await this.browser?.close();
  }

  async goToPage (url: string) {
    await this.page?.goto(url);
  }
}
