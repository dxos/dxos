//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';

import { setupPage } from '@dxos/test-utils';

export class AppManager {
  page!: Page;
  private _initialized = false;

  constructor(private readonly _browser: Browser) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      waitFor: async (page) =>
        (await page.getByTestId('client-0').isVisible()) && (await page.getByTestId('client-1').isVisible()),
    });
    this.page = page;
    this._initialized = true;
  }

  // Getters

  getMarkdownTextbox(id: number) {
    return this.page.getByTestId(`client-${id}`).getByRole('textbox');
  }

  getCollaboratorCursors() {
    return this.page.locator('.cm-collab-selectionInfo');
  }

  // Actions

  async toggleAirplaneMode() {
    await this.page.getByTestId('airplane-mode').click();
  }

  async toggleBatching() {
    await this.page.getByTestId('batching').click();
  }
}
