//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

export class AppManager {
  page!: Page;
  private _initialized = false;

  constructor(private readonly _browser: Browser) {}

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {});
    this.page = page;
    await page.getByTestId('client-0').waitFor({ state: 'visible' });
    await page.getByTestId('client-1').waitFor({ state: 'visible' });
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

  async toggleAirplaneMode(): Promise<void> {
    await this.page.getByTestId('airplane-mode').click();
  }

  async toggleBatching(): Promise<void> {
    await this.page.getByTestId('batching').click();
  }
}
