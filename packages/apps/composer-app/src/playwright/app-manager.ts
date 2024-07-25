//
// Copyright 2023 DXOS.org
//

import type { Browser, Page } from '@playwright/test';
import os from 'node:os';

import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test/playwright';

import { DeckManager } from './plugins';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.
// TODO(wittjosiah): Consider structuring tests in such that they could be run with different sets of plugins enabled.

const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

export class AppManager {
  page!: Page;
  shell!: ShellManager;
  initialUrl!: string;
  deck!: DeckManager;

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

    const { page, initialUrl } = await setupPage(this._browser);
    this.page = page;
    this.initialUrl = initialUrl;

    await this.isAuthenticated();

    this.shell = new ShellManager(this.page, this._inIframe);
    this._initialized = true;
    this.deck = new DeckManager(this.page);
  }

  async closePage() {
    if (this.page !== undefined) {
      await this.page.close();
    }
  }

  //
  // Page
  //

  // Based on https://github.com/microsoft/playwright/issues/8114#issuecomment-1584033229.
  async copy(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyC`);
  }

  async cut(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyX`);
  }

  async paste(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyV`);
  }

  async openIdentityManager() {
    const platform = os.platform();
    const shortcut = platform === 'darwin' ? 'Meta+Shift+.' : platform === 'win32' ? 'Alt+Shift+.' : 'Alt+Shift+>';
    await this.page.keyboard.press(shortcut);
  }

  async openSpaceManager() {
    const shortcut = isMac ? 'Meta+.' : 'Alt+.';
    await this.page.keyboard.press(shortcut);
  }

  isAuthenticated({ timeout = 5_000 } = {}) {
    return this.page
      .getByTestId('treeView.haloButton')
      .waitFor({ timeout })
      .then(() => true)
      .catch(() => false);
  }

  //
  // Toasts
  //

  async toastAction(nth = 0) {
    await this.page.getByTestId('toast.action').nth(nth).click();
  }

  async closeToast(nth = 0) {
    await this.page.getByTestId('toast.close').nth(nth).click();
  }

  //
  // Spaces
  //

  async createSpace(timeout = 10_000) {
    await this.page.getByTestId('spacePlugin.createSpace').click();
    await this.waitForSpaceReady(timeout);
    await this.page.getByTestId('spacePlugin.space').last().getByRole('button').first().click();
  }

  async joinSpace() {
    await this.page.getByTestId('navtree.treeItem.actionsLevel0').first().click();
    await this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  async waitForSpaceReady(timeout = 30_000) {
    await this.page.getByTestId('spacePlugin.shareSpaceButton').waitFor({ timeout });
  }

  getSpacePresenceMembers() {
    return this.page.getByTestId('spacePlugin.presence.member');
  }

  toggleSpaceCollapsed(nth = 0) {
    return this.page.getByTestId('spacePlugin.space').nth(nth).getByRole('button').first().click();
  }

  toggleCollectionCollapsed(nth = 0) {
    return this.page.getByTestId('spacePlugin.object').nth(nth).getByRole('button').first().click();
  }

  // TODO(wittjosiah): Last for backwards compatibility. Default to first object.
  async createObject(plugin: string, nth?: number) {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await (nth ? object.nth(nth) : object.last()).click();
    return this.page.getByTestId(`${plugin}.createObject`).click();
  }

  // TODO(wittjosiah): Last for backwards compatibility. Default to first object.
  async createCollection(nth?: number) {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await (nth ? object.nth(nth) : object.last()).click();
    return this.page.getByTestId('spacePlugin.createCollection').click();
  }

  async renameObject(newName: string, nth = 0) {
    await this.page
      .getByTestId('spacePlugin.object')
      .nth(nth)
      .getByTestId('navtree.treeItem.actionsLevel2')
      .first()
      .click();
    await this.page.getByTestId('spacePlugin.renameObject').last().click();
    await this.page.getByTestId('spacePlugin.renameObject.input').fill(newName);
    await this.page.getByTestId('spacePlugin.renameObject.input').press('Enter');
  }

  async deleteObject(nth = 0) {
    await this.page
      .getByTestId('spacePlugin.object')
      .nth(nth)
      .getByTestId('navtree.treeItem.actionsLevel2')
      .first()
      .click();
    await this.page.getByTestId('spacePlugin.deleteObject').last().click();
    await this.page.getByTestId('spacePlugin.confirmDeleteObject').last().click();
  }

  getObject(nth = 0) {
    return this.page.getByTestId('spacePlugin.object').nth(nth);
  }

  getObjectByName(name: string) {
    return this.page.getByTestId('spacePlugin.object').filter({ has: this.page.locator(`span:has-text("${name}")`) });
  }

  getSpaceItems() {
    return this.page.getByTestId('spacePlugin.space');
  }

  getObjectLinks() {
    return this.page.getByTestId('spacePlugin.object');
  }

  //
  // Plugins
  //

  async openSettings() {
    await this.page.getByTestId('treeView.openSettings').click();
  }

  async toggleExperimenalPlugins() {
    await this.page.getByTestId('pluginSettings.experimental').click();
  }

  async enablePlugin(plugin: string) {
    await this.page.getByTestId(`pluginList.${plugin}`).getByRole('switch').click();
    await this.page.goto(this.initialUrl);
    await this.page.getByTestId('treeView.haloButton').waitFor();
  }

  async changeStorageVersionInMetadata(version: number) {
    await this.page.evaluate(
      ({ version }) => {
        (window as any).composer.changeStorageVersionInMetadata(version);
      },
      { version },
    );

    await this.page.getByTestId('resetDialog').waitFor();
  }

  //
  // Error Boundary
  //

  async reset() {
    await this.page.getByTestId('resetDialog.reset').click();
    await this.page.getByTestId('resetDialog.confirmReset').click();
  }
}
