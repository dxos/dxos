//
// Copyright 2023 DXOS.org
//

import { Context as MochaContext } from 'mocha';
import { Page } from 'playwright';

import { asyncTimeout } from '@dxos/async';
import { setupPage, extensionId } from '@dxos/test';

export class ExtensionManager {
  extensionId!: string;
  page!: Page;

  private _initialized = false;

  constructor(private readonly mochaContext: MochaContext) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page, context } = await setupPage(this.mochaContext, { bridgeLogs: true });

    this.extensionId = await asyncTimeout(extensionId(context), 2000);
    await page.goto(`chrome-extension://${this.extensionId}/popup.html`);

    await page.waitForSelector('body');

    this.page = page;
    this._initialized = true;
  }
}
