//
// Copyright 2023 DXOS.org
//

import type { Browser, Locator, Page } from '@playwright/test';
import os from 'node:os';

import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test-utils/playwright';

import { DeckManager } from './plugins';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.
// TODO(wittjosiah): Consider structuring tests in such that they could be run with different sets of plugins enabled.

const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';
export const INITIAL_URL = 'http://localhost:4200';

export class AppManager {
  page!: Page;
  shell!: ShellManager;
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

    const { page } = await setupPage(this._browser, { url: INITIAL_URL });
    this.page = page;

    await this.isAuthenticated({ timeout: 10_000 });
    await this.confirmRecoveryCode();

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

  async confirmRecoveryCode() {
    await this.page.getByTestId('recoveryCode.confirm').click();
    await this.page.getByTestId('recoveryCode.continue').click();
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

  async createSpace({
    type = 'Document',
    name,
    timeout = 10_000,
  }: { type?: string; name?: string; timeout?: number } = {}) {
    await this.page.getByTestId('spacePlugin.createSpace').click();
    await this.page.getByTestId('create-space-form').getByTestId('save-button').click({ delay: 100 });

    await this.page.getByTestId('create-object-form.schema-input').fill(type);
    await this.page.keyboard.press('Enter');

    const objectForm = this.page.getByTestId('create-object-form');
    if (name) {
      await objectForm.getByLabel('Name').fill(name);
    }
    await objectForm.getByTestId('save-button').click();

    await this.waitForSpaceReady(timeout);
  }

  async joinSpace() {
    await this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  async waitForSpaceReady(timeout = 30_000) {
    await this.page.getByTestId('spacePlugin.shareSpace').waitFor({ timeout });
  }

  getSpacePresenceMembers() {
    return this.page.getByTestId('spacePlugin.presence.member');
  }

  async toggleSpaceCollapsed(nth = 0, nextState?: boolean) {
    const toggle = this.page.getByTestId('spacePlugin.space').nth(nth);

    if (typeof nextState !== 'undefined') {
      const state = await toggle.getAttribute('aria-selected');
      if (state !== nextState.toString()) {
        await toggle.click();
      }
    } else {
      await toggle.click();
    }
  }

  toggleCollectionCollapsed(nth = 0) {
    return this.page.getByTestId('spacePlugin.object').nth(nth).getByRole('button').first().click();
  }

  async createObject({ type, name, nth = 0 }: { type: string; name?: string; nth?: number }) {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await object.nth(nth).click();

    await this.page.getByTestId('create-object-form.schema-input').fill(type);
    await this.page.keyboard.press('Enter');

    const objectForm = this.page.getByTestId('create-object-form');
    if (name) {
      await objectForm.getByLabel('Name').fill(name);
    }
    await objectForm.getByTestId('save-button').click();
  }

  async renameObject(newName: string, nth = 0) {
    await this.page
      .getByTestId('spacePlugin.object')
      .nth(nth)
      .getByTestId('navtree.treeItem.actionsLevel2')
      .first()
      .click();
    // TODO(thure): For some reason, actions move around when simulating the mouse in Firefox.
    await this.page.keyboard.press('ArrowDown');
    await this.page.getByTestId('spacePlugin.renameObject').last().focus();
    await this.page.keyboard.press('Enter');
    await this.page.getByTestId('spacePlugin.renameObject.input').fill(newName);
    await this.page.getByTestId('spacePlugin.renameObject.input').press('Enter');
    await this.page.mouse.move(0, 0, { steps: 4 });
  }

  async deleteObject(nth = 0) {
    await this.page
      .getByTestId('spacePlugin.object')
      .nth(nth)
      .getByTestId('navtree.treeItem.actionsLevel2')
      .first()
      .click();
    // TODO(thure): For some reason, actions move around when simulating the mouse in Firefox.
    await this.page.keyboard.press('ArrowDown');
    await this.page.pause();
    await this.page.getByTestId('spacePlugin.deleteObject').last().focus();
    await this.page.keyboard.press('Enter');
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

  async dragTo(active: Locator, over: Locator, offset: { x: number; y: number } = { x: 0, y: 0 }) {
    const box = await over.boundingBox();
    if (box) {
      await active.hover();
      await this.page.mouse.down();
      // Timeouts are for input discretization in WebKit
      await this.page.waitForTimeout(100);
      await this.page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
    }
  }

  //
  // Plugins
  //

  async openSettings() {
    await this.page.getByTestId('treeView.appSettings').click();
  }

  async openPluginRegistry() {
    await this.page.getByTestId('treeView.pluginRegistry').click();
  }

  async openRegistryCategory(category: string) {
    await this.page.getByTestId(`pluginRegistry.${category}`).click();
  }

  async enablePlugin(plugin: string) {
    await this.page.getByTestId(`pluginList.${plugin}`).locator('input[type="checkbox"]').click();
    await this.page.goto(INITIAL_URL);
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
