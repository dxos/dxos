//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import type { Context as MochaContext } from 'mocha';
import { Page } from 'playwright';

import { asyncTimeout } from '@dxos/async';
import { beforeAll, describe, setupPage, test, extensionId } from '@dxos/test';

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

    this.extensionId = await asyncTimeout(extensionId(context), 30_000);
    await page.goto(`chrome-extension://${this.extensionId}/popup.html`);

    await page.waitForSelector('body');

    this.page = page;
    this._initialized = true;
  }
}

describe('Basic test', () => {
  let extensionManager: ExtensionManager;

  beforeAll(async function () {
    extensionManager = new ExtensionManager(this);
  });

  test('our extension loads', async () => {
    await extensionManager.init();
    expect(await extensionManager.page.locator('body').textContent()).to.include(
      'Open the DXOS Developer Tools extension.'
    );
  });
});
