//
// Copyright 2020 DXOS.org
//

import { BrowserType, Browser as PWBrowser, BrowserContext, Page, LaunchOptions, chromium } from "playwright";

const headless = !!process.env.CI;
const slowMo = process.env.CI ? 0 : 200;

export class Browser {
  browser: PWBrowser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;

  async launchBrowser (_browser: BrowserType, _startUrl: string, options?: LaunchOptions | undefined) {
    this.browser = await _browser.launch({ headless, slowMo, ...options });
    this.context = await this.browser.newContext({viewport: null});
    this.page = await this.context.newPage();
    await this.page.goto(_startUrl, { waitUntil: 'load' });
  }
  
  
  /**
   * Launches a web page with minimal UI, in an app mode.
   * Only chromium.
   */
  async launchApp (url: string, options?: LaunchOptions | undefined) {
    this.browser = await chromium.launch({
      headless,
      slowMo,
      ...options,
      args: [`--app=${url}`, ...(options?.args ?? [])]
    });
  }

  async closeBrowser () {
    await this.browser?.close();
  }

  async goToPage (url: string) {
    await this.page?.goto(url);
  }
}
