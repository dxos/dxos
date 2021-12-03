//
// Copyright 2021 DXOS.org
//

import { BrowserType, Browser as PWBrowser, BrowserContext, Page } from 'playwright';

export class Browser {
  browser?: PWBrowser;
  context?: BrowserContext;
  page?: Page;

  async launch(_browser: BrowserType, _startUrl: string) {
    this.browser = await _browser.launch({
      headless: Boolean(process.env.CI),
      slowMo: process.env.CI ? 0 : 200
    });

    this.context = await this.browser.newContext();

    this.page = await this.context.newPage();

    await this.getPage().goto(_startUrl, { waitUntil: 'load' });
  }

  get() {
    return this.browser!;
  }

  getPage() {
    return this.page!;
  }
}
