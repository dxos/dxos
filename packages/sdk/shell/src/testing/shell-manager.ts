//
// Copyright 2023 DXOS.org
//

import type { ConsoleMessage, Dialog, Page } from '@playwright/test';

import { sleep, Trigger } from '@dxos/async';

import { ScopedShellManager } from './scoped-shell-manager';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.

export class ShellManager extends ScopedShellManager {
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();

  // prettier-ignore
  constructor(
    override readonly page: Page,
    readonly inIFrame = true,
  ) {
    super();
    this.page.on('console', (message) => this._onConsoleMessage(message));
  }

  get shell() {
    return this.inIFrame ? this.page.frameLocator('data-testid=dxos-shell') : this.page;
  }

  // Getters

  async getDisplayName(): Promise<string | null> {
    return this.shell.getByTestId('identityHeading.displayName').textContent();
  }

  async isCurrentSpaceViewVisible(): Promise<boolean> {
    return await this.shell.getByTestId('current-space-view').isVisible();
  }

  async isSpaceListViewVisible(): Promise<boolean> {
    return await this.shell.getByTestId('space-list-view').isVisible();
  }

  // Actions

  async createIdentity(name: string) {
    await this.shell.getByTestId('create-identity').click();
    await this.page.keyboard.type(name);
    await this.shell.getByTestId('create-identity-input-continue').click();
    await this.shell.getByTestId('halo-invitation-accepted-done').click();
  }

  async createDeviceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.shell.getByTestId('devices-panel.create-invitation').click();
    return await this._invitationCode.wait();
  }

  async resetDevice() {
    const handleDialog = async (dialog: Dialog) => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    };

    this.page.on('dialog', handleDialog);
    await this.shell.getByTestId('devices-panel.sign-out').click();
    await this.shell.getByTestId('reset-storage.reset-identity-input').fill('CONFIRM');
    await this.shell.getByTestId('reset-storage.reset-identity-confirm').click();
  }

  async joinNewIdentity(invitationCode: string) {
    await this.shell.getByTestId('devices-panel.join-new-identity').click();
    await this.shell.getByTestId('join-new-identity.reset-identity-input').fill('CONFIRM');
    await this.shell.getByTestId('join-new-identity.reset-identity-input-confirm').click();
    await this.inputInvitation('device', invitationCode, this.shell);
  }

  async authenticateDevice(authCode: string, skipDone = true) {
    // Wait for focus to shift before typing.
    await sleep(1500);
    await this.authenticateInvitation('device', authCode, this.shell);
    // TODO(wittjosiah): When "signing out" and joinging a new identity, the done step seems to be skipped.
    if (!skipDone) {
      await this.doneInvitation('device', this.shell);
    }
  }

  async closeShell() {
    await this.page.keyboard.press('Escape');
  }

  async createSpaceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.shell.getByTestId('spaces-panel.create-invitation').click();
    return await this._invitationCode.wait();
  }

  async acceptSpaceInvitation(invitationCode: string) {
    await this.inputInvitation('space', invitationCode, this.shell);
  }

  async getAuthCode(): Promise<string> {
    return await this._authCode.wait();
  }

  async authenticate(authCode: string) {
    // Wait for focus to shift before typing.
    await sleep(1500);
    await this.authenticateInvitation('space', authCode, this.shell);
    await this.doneInvitation('space', this.shell);
  }

  private async _onConsoleMessage(message: ConsoleMessage) {
    try {
      const json = JSON.parse(message.text());
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
      if (json.authCode) {
        this._authCode.wake(json.authCode);
      }
    } catch {}
  }
}
