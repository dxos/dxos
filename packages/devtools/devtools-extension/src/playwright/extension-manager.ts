//
// Copyright 2023 DXOS.org
//

import type { Page } from '@playwright/test';

// import { asyncTimeout } from '@dxos/async';
// import { setupPage, extensionId, type BrowserType, getPersistentContext } from '@dxos/test/playwright';

export class ExtensionManager {
  extensionId!: string;
  page!: Page;

  private _initialized = false;

  constructor(private readonly _browserName: string) {}

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // const context = await getPersistentContext(this._browserName);
    // this.extensionId = await asyncTimeout(extensionId(context), 2000);
    // const { page } = await setupPage(context, {
    //   url: `chrome-extension://${this.extensionId}/popup.html`,
    //   // TODO(wittjosiah): Use data-testid.
    //   waitFor: (page) => page.locator('body').isVisible(),
    //   bridgeLogs: true,
    // });

    // this.page = page;
    this._initialized = true;
  }
}
