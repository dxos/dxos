//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from 'playwright';

import { HaloShellManager } from '@dxos/halo-app/testing';
import { setupPage } from '@dxos/test/playwright';

export class AppManager {
  page!: Page;
  shell!: HaloShellManager;

  private _inIframe: boolean | undefined = undefined;
  private _initialized = false;

  constructor(private readonly _browser: Browser, inIframe?: boolean) {
    this._inIframe = inIframe;
  }

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      waitFor: (page) => page.getByTestId('composer.pageReady').isVisible()
    });
    this.page = page;
    this.shell = new HaloShellManager(this.page, this._inIframe);
    this._initialized = true;
  }

  async isAuthenticated() {
    return await this.page.getByTestId('composer.firstRunMessage').isVisible();
  }

  // Actions

  async createSpace() {
    await this.page.getByTestId('add-button').click();
  }
}
