//
// Copyright 2023 DXOS.org
//

import type { Browser, ConsoleMessage, Locator, Page } from '@playwright/test';
import os from 'node:os';

import { Trigger } from '@dxos/async';
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
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();

  // prettier-ignore
  constructor(
    private readonly _browser: Browser,
    inIframe?: boolean,
  ) {
    this._inIframe = inIframe;
  }

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, { url: INITIAL_URL });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));

    await this.isAuthenticated({ timeout: 15_000 });

    this.shell = new ShellManager(this.page, this._inIframe);
    this._initialized = true;
    this.deck = new DeckManager(this.page);
  }

  async closePage(): Promise<void> {
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

  isAuthenticated({ timeout = 5_000 } = {}): Promise<boolean> {
    return this.page
      .getByTestId('treeView.userAccount')
      .waitFor({ timeout })
      .then(() => true)
      .catch(() => false);
  }

  async openUserAccount(): Promise<void> {
    const platform = os.platform();
    const shortcut = platform === 'darwin' ? 'Meta+Shift+.' : platform === 'win32' ? 'Alt+Shift+.' : 'Alt+Shift+>';
    await this.page.keyboard.press(shortcut);
    // Wait for the user account menu to open
    await this.page.getByTestId('clientPlugin.devices').waitFor({ timeout: 5_000 });
  }

  async openUserDevices(): Promise<void> {
    await this.openUserAccount();
    await this.page.getByTestId('clientPlugin.devices').click();
    // Wait for the devices page to load
    await this.page.getByTestId('devicesContainer.createInvitation').waitFor({ timeout: 5_000 });
  }

  async createDeviceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.page.getByTestId('devicesContainer.createInvitation').click();
    return await this._invitationCode.wait();
  }

  async getAuthCode(): Promise<string> {
    return await this._authCode.wait();
  }

  async resetDevice(confirmInput = 'RESET'): Promise<void> {
    await this.page.getByTestId('devicesContainer.reset').click();
    await this.page.getByTestId('reset-storage.reset-identity-input').fill(confirmInput);
    await this.page.getByTestId('reset-storage.reset-identity-confirm').click();
  }

  async joinNewIdentity(confirmInput = 'RESET'): Promise<void> {
    await this.page.getByTestId('devicesContainer.joinExisting').click();
    await this.page.getByTestId('join-new-identity.reset-identity-input').fill(confirmInput);
    await this.page.getByTestId('join-new-identity.reset-identity-confirm').click();
  }

  async shareSpace(): Promise<void> {
    const shortcut = isMac ? 'Meta+.' : 'Alt+.';
    await this.page.keyboard.press(shortcut);
    // Wait for the share space modal to open
    await this.page.getByTestId('membersContainer.createInvitation.more').waitFor({ timeout: 5_000 });
  }

  async createSpaceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.page.getByTestId('membersContainer.createInvitation.more').click();
    await this.page.getByTestId('membersContainer.inviteOne').click();
    await this.page.getByTestId('membersContainer.createInvitation').click();
    return await this._invitationCode.wait();
  }

  async confirmRecoveryCode(): Promise<void> {
    await this.page.getByTestId('recoveryCode.confirm').click();
    await this.page.getByTestId('recoveryCode.continue').click();
  }

  //
  // Toasts
  //

  async toastAction(nth = 0): Promise<void> {
    await this.page.getByTestId('toast.action').nth(nth).click();
  }

  async closeToast(nth = 0): Promise<void> {
    await this.page.getByTestId('toast.close').nth(nth).click();
  }

  //
  // Spaces
  //

  async createSpace({ timeout = 10_000 }: { timeout?: number } = {}): Promise<void> {
    await this.page.getByTestId('spacePlugin.addSpace').click();
    await this.page.getByTestId('spacePlugin.createSpace').click();
    await this.page.getByTestId('create-space-form').getByTestId('save-button').click({ delay: 100 });

    await this.waitForSpaceReady(timeout);
  }

  async joinSpace(): Promise<void> {
    await this.page.getByTestId('spacePlugin.addSpace').click();
    await this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  async waitForSpaceReady(timeout = 30_000): Promise<void> {
    await this.page.getByTestId('treeView.alternateTreeButton').waitFor({ timeout });
  }

  getSpacePresenceMembers(): Locator {
    return this.page.getByTestId('spacePlugin.presence.member');
  }

  async toggleSpaceCollapsed(nth = 0, nextState?: boolean): Promise<void> {
    const toggle = this.page.getByTestId('spacePlugin.space').nth(nth);

    if (typeof nextState !== 'undefined') {
      const state = await toggle.getAttribute('aria-selected');
      if (state !== nextState.toString()) {
        await toggle.click();
        // Wait for the state to change
        await this.page.waitForTimeout(500);
      }
    } else {
      await toggle.click();
      // Wait for the state to change
      await this.page.waitForTimeout(500);
    }
  }

  toggleCollectionCollapsed(nth = 0): Promise<void> {
    return this.page.getByTestId('spacePlugin.object').nth(nth).getByRole('button').first().click();
  }

  async createObject({ type, name, nth = 0 }: { type: string; name?: string; nth?: number }): Promise<void> {
    const object = this.page.getByTestId('spacePlugin.createObject');
    await object.nth(nth).click();

    await this.page.getByTestId('create-object-form.schema-input').fill(type);
    await this.page.keyboard.press('Enter');

    const objectForm = this.page.getByTestId('create-object-form');
    if (!(await objectForm.isVisible())) {
      // Wait for the object to be created
      await this.page.waitForTimeout(1000);
      return;
    }

    if (name) {
      await objectForm.getByLabel('Name').fill(name);
    }
    await objectForm.getByTestId('save-button').click();
    // Wait for the object to be created
    await this.page.waitForTimeout(1000);
  }

  async navigateToObject(nth = 0): Promise<void> {
    await this.page.getByTestId('spacePlugin.object').nth(nth).click();
    // Wait for navigation to complete
    await this.page.waitForTimeout(1000);
  }

  async renameObject(newName: string, nth = 0): Promise<void> {
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
    // Wait for the rename to complete
    await this.page.waitForTimeout(1000);
  }

  async deleteObject(nth = 0): Promise<void> {
    await this.page
      .getByTestId('spacePlugin.object')
      .nth(nth)
      .getByTestId('navtree.treeItem.actionsLevel2')
      .first()
      .click();
    // TODO(thure): For some reason, actions move around when simulating the mouse in Firefox.
    await this.page.keyboard.press('ArrowDown');
    await this.page.getByTestId('spacePlugin.deleteObject').last().focus();
    await this.page.keyboard.press('Enter');
    // Wait for the delete to complete
    await this.page.waitForTimeout(1000);
  }

  getObject(nth = 0): Locator {
    return this.page.getByTestId('spacePlugin.object').nth(nth);
  }

  getObjectByName(name: string): Locator {
    return this.page.getByTestId('spacePlugin.object').filter({ has: this.page.locator(`span:has-text("${name}")`) });
  }

  getSpaceItems(): Locator {
    return this.page.getByTestId('spacePlugin.space');
  }

  getObjectLinks(): Locator {
    return this.page.getByTestId('spacePlugin.object');
  }

  async dragTo(active: Locator, over: Locator, offset: { x: number; y: number } = { x: 0, y: 0 }): Promise<void> {
    const box = await over.boundingBox();
    if (box) {
      await active.hover();
      await this.page.mouse.down();
      // Timeouts are for input discretization in WebKit
      await this.page.waitForTimeout(100);
      await this.page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
      // Wait for the drag to complete
      await this.page.waitForTimeout(1000);
    }
  }

  //
  // Plugins
  //

  async openSettings(): Promise<void> {
    await this.page.getByTestId('treeView.appSettings').click();
    // Wait for settings to load
    await this.page.waitForTimeout(500);
  }

  async openPluginRegistry(): Promise<void> {
    await this.page.getByTestId('treeView.pluginRegistry').click();
    // Wait for registry to load
    await this.page.waitForTimeout(500);
  }

  async openRegistryCategory(category: string): Promise<void> {
    await this.page.getByTestId(`pluginRegistry.${category}`).click();
    // Wait for category to load
    await this.page.waitForTimeout(500);
  }

  getPluginToggle(plugin: string): Locator {
    return this.page.getByTestId(`pluginList.${plugin}`).locator('input[type="checkbox"]');
  }

  async enablePlugin(plugin: string): Promise<void> {
    await this.getPluginToggle(plugin).click();
    await this.page.goto(INITIAL_URL);
    await this.page.getByTestId('treeView.userAccount').waitFor();
  }

  async changeStorageVersionInMetadata(version: number): Promise<void> {
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

  async reset(): Promise<void> {
    await this.page.getByTestId('resetDialog.reset').click();
    await this.page.getByTestId('resetDialog.confirmReset').click();
  }

  private async _onConsoleMessage(message: ConsoleMessage): Promise<void> {
    try {
      const text = message.text();
      const json = JSON.parse(text.slice(text.indexOf('{')));
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
      if (json.authCode) {
        this._authCode.wake(json.authCode);
      }
    } catch {}
  }
}
