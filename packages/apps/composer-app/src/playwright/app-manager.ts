//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';
import os from 'node:os';

import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test/playwright';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.
// TODO(wittjosiah): Consider structuring tests in such that they could be run with different sets of plugins enabled.

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
    await this.closeToast(); // Close telemetry toast.
    this._initialized = true;
  }

  //
  // Page
  //

  // Based on https://github.com/microsoft/playwright/issues/8114#issuecomment-1584033229.
  async copy(): Promise<void> {
    const isMac = os.platform() === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+KeyC`);
  }

  async cut(): Promise<void> {
    const isMac = os.platform() === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+KeyX`);
  }

  async paste(): Promise<void> {
    const isMac = os.platform() === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+KeyV`);
  }

  async openIdentityManager() {
    await this.page.keyboard.press('Meta+Shift+.');
  }

  async openSpaceManager() {
    await this.page.keyboard.press('Meta+.');
  }

  isAuthenticated() {
    return this.page.getByTestId('layoutPlugin.firstRunMessage').isVisible();
  }

  //
  // Toasts
  //

  getToasts() {
    return this.page.getByTestId('toast');
  }

  async toastAction(nth = 0) {
    await this.page.getByTestId('toast.action').nth(nth).click();
  }

  async closeToast(nth = 0) {
    await this.page.getByTestId('toast.close').nth(nth).click();
  }

  //
  // Spaces
  //

  async createSpace() {
    await this.page.getByTestId('spacePlugin.createSpace').click();
    return this.page.getByTestId('navtree.treeItem.openTrigger').last().click();
  }

  async joinSpace() {
    await this.page.getByTestId('navtree.treeItem.actionsLevel0').nth(1).click({ button: 'right' });
    return this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  toggleSpaceCollapsed(nth = 0) {
    return this.page.getByTestId('spacePlugin.space').nth(nth).getByRole('button').first().click();
  }

  toggleFolderCollapsed(nth = 0) {
    return this.page.getByTestId('spacePlugin.object').nth(nth).getByRole('button').first().click();
  }

  // TODO(wittjosiah): Last for backwards compatibility. Default to first object.
  async createObject(plugin: string, nth?: number) {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await (nth ? object.nth(nth) : object.last()).click();
    return this.page.getByTestId(`${plugin}.createObject`).click();
  }

  // TODO(wittjosiah): Last for backwards compatibility. Default to first object.
  async createFolder(nth?: number) {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await (nth ? object.nth(nth) : object.last()).click();
    return this.page.getByTestId('spacePlugin.createFolder').click();
  }

  async renameObject(newName: string, nth = 0) {
    await this.page.getByTestId('spacePlugin.object').nth(nth).click({ button: 'right' });
    await this.page.getByTestId('spacePlugin.renameObject').last().click();
    await this.page.getByTestId('spacePlugin.renameObject.input').fill(newName);
    await this.page.getByTestId('spacePlugin.renameObject.input').press('Enter');
  }

  async deleteObject(nth = 0) {
    await this.page.getByTestId('spacePlugin.object').nth(nth).click({ button: 'right' });
    await this.page.getByTestId('spacePlugin.deleteObject').last().click();
    await this.page.getByTestId('spacePlugin.confirmDeleteObject').last().click();
  }

  getObject(nth = 0) {
    return this.page.getByTestId('spacePlugin.object').nth(nth);
  }

  getObjectByName(name: string) {
    return this.page.getByTestId('spacePlugin.object').filter({ has: this.page.locator(`span:has-text("${name}")`) });
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

  getObjectLinks() {
    return this.page.getByTestId('spacePlugin.object');
  }

  //
  // Plugins
  //

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
}
