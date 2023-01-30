//
// Copyright 2023 DXOS.org
//

import type { ConsoleMessage, Page } from 'playwright';

import { sleep, Trigger } from '@dxos/async';

export class ShellManager {
  private _invitationCode = new Trigger<string>();
  private _authenticationCode = new Trigger<string>();

  constructor(readonly page: Page) {
    this.page.on('console', (message) => this._onConsoleMessage(message));
  }

  get shell() {
    return this.page.frameLocator('data-testid=dxos-shell');
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
    await this.shell.getByTestId('identity-added-done').click();
  }

  async closeShell() {
    await this.page.keyboard.press('Escape');
  }

  async openCurrentSpace() {
    await this.page.keyboard.press('Control+.');
  }

  async openSpaceList() {
    await this.page.keyboard.press('Control+Shift+>');
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
    await this.shell.getByTestId('create-space-invitation').click();
    return await this._invitationCode.wait();
  }

  async acceptSpaceInvitation(invitationCode: string) {
    // TODO(wittjosiah): Why is this needed?
    await sleep(10);
    await this.openSpaceList();
    await this.shell.getByTestId('join-space').click();
    await this.shell.getByTestId('select-identity').click();
    // Wait for focus to shift before typing.
    await sleep(10);
    await this.page.keyboard.type(invitationCode);
    await this.shell.getByTestId('space-invitation-input-continue').click();
  }

  async getAuthenticationCode(): Promise<string> {
    this._authenticationCode = new Trigger<string>();
    return await this._authenticationCode.wait();
  }

  async authenticate(authenticationCode: string) {
    // Wait for focus to shift before typing.
    await sleep(10);
    await this.page.keyboard.type(authenticationCode);
    await this.shell.getByTestId('space-invitation-authenticator-next').click();
    await this.shell.getByTestId('space-invitation-accepted-done').click();
  }

  private async _onConsoleMessage(message: ConsoleMessage) {
    try {
      const json = JSON.parse(message.text());
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
      if (json.authenticationCode) {
        this._authenticationCode.wake(json.authenticationCode);
      }
    } catch {}
  }
}
