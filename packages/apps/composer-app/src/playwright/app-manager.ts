//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';

import { StackManager } from '@dxos/react-ui-stack/testing';
import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test/playwright';

export class AppManager {
  page!: Page;
  shell!: ShellManager;
  initialUrl!: string;

  private readonly _inIframe: boolean | undefined = undefined;
  private _initialized = false;

  // prettier-ignore
  constructor(
    private readonly _browser: Browser,
    inIframe?: boolean,
  ) {
    this._inIframe = inIframe;
  }

  async init() {
    if (this._initialized) {
      return;
    }

    const { page, initialUrl } = await setupPage(this._browser, {
      waitFor: (page) => page.getByTestId('treeView.haloButton').isVisible(),
    });
    this.page = page;
    this.initialUrl = initialUrl;
    this.shell = new ShellManager(this.page, this._inIframe);
    this._initialized = true;
  }

  isAuthenticated() {
    return this.page.getByTestId('layoutPlugin.firstRunMessage').isVisible();
  }

  async createSpace() {
    await this.page.getByTestId('spacePlugin.createSpace').click();
    return this.page.getByTestId('navtree.treeItem.openTrigger').last().click();
  }

  async joinSpace() {
    await this.page.getByTestId('navtree.treeItem.actionsLevel0').nth(1).click({ button: 'right' });
    return this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  // TODO(wittjosiah): This is not always a space.
  expandSpace() {
    return this.page.getByTestId('navtree.treeItem.openTrigger').last().click();
  }

  async createObject(plugin: string) {
    await this.page.getByTestId('spacePlugin.createObject').last().click();
    return this.page.getByTestId(`${plugin}.createObject`).last().click();
  }

  async createFolder() {
    await this.page.getByTestId('spacePlugin.createObject').last().click();
    return this.page.getByTestId('spacePlugin.createFolder').last().click();
  }

  async deleteObject(itemNumber: number) {
    // TODO: Would prefer to use testId of `spacePlugin.object`, but for folders, it refers to the entire block
    // including all of the containing item, so the click doesn't land on the folder, but in the middle of the
    // folder's containing items.
    await this.page.getByTestId('navtree.treeItem.actionsLevel2').nth(itemNumber).click({ button: 'right' });
    await this.page.getByTestId('spacePlugin.deleteObject').last().click();
    return this.page.getByTestId('spacePlugin.confirmDeleteObject').last().click();
  }

  async getSpaceItemsCount() {
    const [openCount, closedCount] = await Promise.all([
      this.page.getByTestId('spacePlugin.personalSpace').count(),
      this.page.getByTestId('spacePlugin.space').count(),
    ]);
    return openCount + closedCount;
  }

  getObjectsCount() {
    return this.page.getByTestId('spacePlugin.object').count();
  }

  getFoldersCount() {
    return this.page.getByTestId('spacePlugin.folder').count();
  }

  getObjectLinks() {
    return this.page.getByTestId('spacePlugin.object');
  }

  async enablePlugin(plugin: string) {
    await this.page.getByTestId('treeView.openSettings').click();
    await this.page.getByTestId(`pluginList.${plugin}`).getByRole('switch').click();
    await this.page.goto(this.initialUrl);
    await this.page.getByTestId('treeView.haloButton').waitFor();
  }

  async changeStorageVersionInMetadata(version: number) {
    await this.page.evaluate(
      ({ version }) => {
        (window as any).changeStorageVersionInMetadata(version);
      },
      { version },
    );

    await this.page.getByTestId('resetDialog').waitFor();
  }

  // TODO(wittjosiah): Consider factoring out into plugin packages.

  // Markdown Plugin

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

  getCollaboratorCursors() {
    return this.page.locator('.cm-ySelectionInfo');
  }

  // Stack Plugin

  getStack() {
    return new StackManager(this.page.getByTestId('main.stack'));
  }

  async createSection(plugin: string) {
    await this.page.getByTestId('stack.createSection').click();
    return this.page.getByTestId(`${plugin}.createSection`).click();
  }
}
