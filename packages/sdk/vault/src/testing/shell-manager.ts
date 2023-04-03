//
// Copyright 2023 DXOS.org
//

import type { ConsoleMessage, Page } from 'playwright';

import { sleep, Trigger } from '@dxos/async';
import { Invitation } from '@dxos/client';
import { ShellManager as NaturalShellManager } from '@dxos/react-ui/testing';

export class ShellManager extends NaturalShellManager {
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();

  constructor(override readonly page: Page, readonly inIFrame = true) {
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

  async joinIdentity() {
    await this.shell.getByTestId('join-identity').click();
  }

  async closeShell() {
    await this.page.keyboard.press('Escape');
  }

  async openCurrentSpace() {
    await this.page.keyboard.press('Control+.');
  }

  async openCurrentIdentity() {
    await this.page.keyboard.press('Control+Shift+>');
  }

  async showAllSpaces() {
    await this.shell.getByTestId('show-all-spaces').click();
  }

  async showCurrentSpace() {
    await this.shell.getByTestId('show-current-space').click();
  }

  async createInvitation(kind = Invitation.Kind.SPACE): Promise<string> {
    kind === Invitation.Kind.SPACE ? await this.openCurrentSpace() : await this.openCurrentIdentity();
    this._invitationCode = new Trigger<string>();
    await this.shell
      .getByTestId(`${kind === Invitation.Kind.SPACE ? 'spaces' : 'devices'}-panel.create-invitation`)
      .click();
    return await this._invitationCode.wait();
  }

  async acceptInvitation(invitationCode: string, kind = Invitation.Kind.SPACE) {
    await this.inputInvitation(kind === Invitation.Kind.SPACE ? 'space' : 'device', invitationCode, this.shell);
  }

  async getAuthCode(): Promise<string> {
    this._authCode = new Trigger<string>();
    return await this._authCode.wait();
  }

  async authenticate(authCode: string, kind = Invitation.Kind.SPACE) {
    // Wait for focus to shift before typing.
    await sleep(10);
    await this.authenticateInvitation(kind === Invitation.Kind.SPACE ? 'space' : 'device', authCode, this.shell);
    await this.doneInvitation(kind === Invitation.Kind.SPACE ? 'space' : 'device', this.shell);
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
