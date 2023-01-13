//
// Copyright 2022 DXOS.org
//

import { Browser, BrowserContext, BrowserType, Page, chromium } from 'playwright';

import { Bounds } from './grid';

/**
 * https://playwright.dev/docs/api/class-playwright
 * Tip: Use "$$()" to select DOM nodes in browser console.
 */
export class Launcher {
  // https://peter.sh/experiments/chromium-command-line-switches
  static createPositionalArgs(bounds: Bounds) {
    return [`--window-position=${bounds.x},${bounds.y}`, `--window-size=${bounds.width},${bounds.height}`];
  }

  private _browser?: Browser;
  private _context?: BrowserContext;
  private _page?: Page;

  constructor(
    private readonly _baseUrl: string,
    private readonly _type: BrowserType = chromium,
    private readonly _launchOptions = {}
  ) {}

  toString() {
    return `Launcher(${this._baseUrl})`;
  }

  get browser(): Browser {
    return this._browser!;
  }

  get context(): BrowserContext {
    return this._context!;
  }

  get page(): Page {
    return this._page!;
  }

  url(path: string): string {
    return this._baseUrl + '/' + path;
  }

  async open() {
    // https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    this._browser = await this._type.launch(this._launchOptions);
    this._context = await this._browser.newContext({ viewport: null });
    await this._context.grantPermissions(['clipboard-write', 'clipboard-read']);
    this._page = await this._context.newPage();
  }

  async close() {
    await this._browser?.close();
  }
}
