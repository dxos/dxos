//
// Copyright 2023 DXOS.org
//

import type { ConsoleMessage, Page } from '@playwright/test';

import { sleep, Trigger } from '@dxos/async';

import { ScopedShellManager } from './scoped-shell-manager';

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

  async closeShell() {
    await this.page.keyboard.press('Escape');
  }

  // TODO(wittjosiah): These shortcuts are no longer within the SDK so these commands should live elsewhere.
  async openCurrentSpace() {
    await this.page.keyboard.press('Meta+.');
  }

  async openSpaceList() {
    await this.page.keyboard.press('Meta+Shift+>');
  }

  async showAllSpaces() {
    await this.shell.getByTestId('show-all-spaces').click();
  }

  async showCurrentSpace() {
    await this.shell.getByTestId('show-current-space').click();
  }

  async createSpaceInvitation(): Promise<string> {
    await this.openCurrentSpace();
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
