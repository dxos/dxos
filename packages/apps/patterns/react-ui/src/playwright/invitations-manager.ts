//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { ConsoleMessage, Page } from 'playwright';

import { sleep, Trigger } from '@dxos/async';
import { setupPage } from '@dxos/test';

// TODO(wittjosiah): Factor out.
// TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

export type PanelType = number | 'identity' | 'devices' | 'spaces' | 'join';

export class InvitationsManager {
  page!: Page;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authenticationCode = new Trigger<string>();

  constructor(private readonly mochaContext: MochaContext) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this.mochaContext, {
      url: storybookUrl('invitations--default'),
      timeout: 120_000, // TODO(wittjosiah): Storybook startup is slower than it should be.
      waitFor: (page) => page.getByTestId('invitations.identity-header').nth(0).isVisible()
    });

    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this._initialized = true;
  }

  // Getters

  async getDisplayName(id: number) {
    // TODO(wittjosiah): Update id.
    return this._peer(id).getByTestId('identity-list-item').nth(0).textContent();
  }

  async getSpaceName(id: number, nth: number) {
    // TODO(wittjosiah): Update id.
    return this._peer(id).getByTestId('space-list-item').nth(nth).textContent();
  }

  // Actions

  async openPanel(id: number, panel: PanelType) {
    const peer = this._peer(id);

    if (typeof panel === 'number') {
      // TODO(wittjosiah): Update id.
      await peer.getByTestId('space-list-item').nth(panel).click();
    }

    switch (panel) {
      case 'identity':
        await peer.getByTestId('invitations.open-join-identity').click();
        break;

      case 'devices':
        await peer.getByTestId('invitations.open-devices').click();
        break;

      case 'spaces':
        await peer.getByTestId('invitations.list-spaces').click();
        break;

      case 'join':
        await peer.getByTestId('invitations.open-join-space').click();
        break;
    }
  }

  async createIdentity(id: number) {
    await this._peer(id).getByTestId('invitations.create-identity').click();
  }

  async createSpace(id: number) {
    await this._peer(id).getByTestId('invitations.create-space').click();
  }

  async createInvitation(id: number, type: 'device' | 'space'): Promise<string> {
    const peer = this._peer(id);
    this._invitationCode = new Trigger<string>();
    await peer.getByTestId(`${type}s-panel.create-invitation`).click();
    return this._invitationCode.wait();
  }

  async acceptInvitation(id: number, type: 'device' | 'space', invitation: string) {
    const peer = this._peer(id);
    // TODO(wittjosiah): Update ids.
    await peer.getByTestId(type === 'device' ? 'join-identity' : 'select-identity').click();
    await this.page.keyboard.type(invitation);
    await this.page.keyboard.press('Enter');
  }

  async getAuthenticationCode(): Promise<string> {
    this._authenticationCode = new Trigger<string>();
    return await this._authenticationCode.wait();
  }

  async authenticateInvitation(id: number, type: 'device' | 'space', authenticationCode: string) {
    // Wait for focus to shift before typing.
    await sleep(100);
    await this.page.keyboard.type(authenticationCode);

    const peer = this._peer(id);
    // TODO(wittjosiah): Update ids.
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-authenticator-next`).click();
    await peer.getByTestId(type === 'device' ? 'identity-added-done' : 'space-invitation-accepted-done').click();
  }

  // TODO(wittjosiah): Peer manager?
  private _peer(id: number) {
    return this.page.getByTestId(`peer-${id}`);
  }

  private async _onConsoleMessage(message: ConsoleMessage) {
    try {
      const json = JSON.parse(message.text());
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      } else if (json.authenticationCode) {
        this._authenticationCode.wake(json.authenticationCode);
      }
    } catch {}
  }
}
