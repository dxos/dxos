//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';

import { setupPage } from '@dxos/test/playwright';
import { ShellManager } from '@dxos/vault/testing';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private readonly _inIframe: boolean | undefined = undefined;
  private _initialized = false;

  constructor(private readonly _browser: Browser, inIframe?: boolean) {
    this._inIframe = inIframe;
  }

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      waitFor: (page) => page.getByTestId('dxos-shell').isVisible(),
    });
    this.page = page;
    this.shell = new ShellManager(this.page, this._inIframe);
    this._initialized = true;
  }

  isAuthenticated() {
    return this.page.getByTestId('splitViewPlugin.firstRunMessage').isVisible();
  }

  createSpace() {
    return this.page.getByTestId('spacePlugin.createSpace').click();
  }

  joinSpace() {
    return this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  createDocument() {
    return this.page.getByTestId('spacePlugin.createDocument').last().click();
  }

  getSpaceItemsCount() {
    return this.page.getByTestId('spacePlugin.spaceTreeItemHeading').count();
  }

  getDocumentItemsCount() {
    return this.page.getByTestId('spacePlugin.documentTreeItemHeading').count();
  }

  getMarkdownTextbox() {
    return this.page.getByTestId('composer.markdownRoot').getByRole('textbox');
  }

  getMarkdownActiveLineText() {
    return this.getMarkdownTextbox()
      .locator('.cm-activeLine > span:not([class=cm-ySelectionCaret])')
      .first()
      .textContent();
  }

  waitForMarkdownTextbox() {
    return this.getMarkdownTextbox().waitFor();
  }

  getDocumentTitleInput() {
    return this.page.getByTestId('composer.documentTitle');
  }

  getDocumentLinks() {
    return this.page.getByTestId('spacePlugin.documentTreeItemHeading');
  }

  getCollaboratorCursors() {
    return this.page.locator('.cm-ySelectionInfo');
  }
}
