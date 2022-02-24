//
// Copyright 2022 DXOS.org
//

import { Browser, BrowserType, chromium } from 'playwright';
import urljoin from 'url-join';

// TODO(burdon): Factor out to debug package (gravity?)

const config = {
  // esbuild-server book
  baseUrl: 'http://localhost:8080/#/'
};

/**
 * https://playwright.dev/docs/api/class-playwright
 */
export class Launcher {
  private _browser?: Browser;

  constructor (
    private readonly _baseUrl: string,
    private readonly _type: BrowserType = chromium
  ) {}

  get browser (): Browser {
    return this._browser!;
  }

  url (path: string): string {
    return urljoin(this._baseUrl, path);
  }

  async open () {
    // https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    this._browser = await this._type.launch({});
  }

  async close () {
    await this._browser?.close();
  }
}
