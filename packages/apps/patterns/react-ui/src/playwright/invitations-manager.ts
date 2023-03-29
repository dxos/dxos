//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import type { Browser, ConsoleMessage } from 'playwright';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import type { InvitationsOptions } from '@dxos/client';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { setupPage } from '@dxos/test/playwright';

import { ShellManager } from '../testing';

// TODO(wittjosiah): Factor out.
// TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

export type PanelType = number | 'identity' | 'devices' | 'spaces' | 'join';

export class InvitationsManager extends ShellManager {
  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authenticationCode = new Trigger<string>();

  constructor(private readonly _browser: Browser) {
    super();
  }

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      url: storybookUrl('invitations--default'),
      waitFor: (page) => page.getByTestId('invitations.identity-header').nth(0).isVisible()
    });

    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this._initialized = true;
  }

  // Getters

  async getDisplayName(id: number) {
    // TODO(wittjosiah): Update id.
    return this.peer(id).getByTestId('identity-list-item').nth(0).textContent();
  }

  async getSpaceName(id: number, nth: number) {
    // TODO(wittjosiah): Update id.
    return this.peer(id).getByTestId('space-list-item').nth(nth).textContent();
  }

  // Actions

  async setConnectionState(id: number, state: ConnectionState) {
    await this.page.evaluate(
      ({ id, state }) => {
        (window as any)[`peer${id}client`].mesh.setConnectionState(state);
      },
      { id, state }
    );
  }

  async openPanel(id: number, panel: PanelType) {
    const peer = this.peer(id);

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
    const createIdentity = this.peer(id).getByTestId('invitations.create-identity');
    // TODO(wittjosiah): Clicking on buttons wrapped in tooltips is flaky in webkit playwright.
    await createIdentity.click();
    await waitForExpect(async () => {
      expect(await createIdentity.isDisabled()).to.be.true;
    });
  }

  async createSpace(id: number) {
    await this.peer(id).getByTestId('invitations.create-space').click();
  }

  async createInvitation(id: number, type: 'device' | 'space', options?: InvitationsOptions): Promise<string> {
    if (!options) {
      const peer = this.peer(id);
      this._invitationCode = new Trigger<string>();
      await peer.getByTestId(`${type}s-panel.create-invitation`).click();
      return this._invitationCode.wait();
    }

    this._invitationCode = new Trigger<string>();
    await this.page.evaluate(
      ({ id, type, options }) => {
        if (type === 'device') {
          (window as any)[`peer${id}client`].halo.createInvitation(options);
        } else {
          (window as any)[`peer${id}space`].createInvitation(options);
        }
      },
      { id, type, options }
    );
    return this._invitationCode.wait();
  }

  async acceptInvitation(id: number, type: 'device' | 'space', invitation: string) {
    const peer = this.peer(id);
    // TODO(wittjosiah): Update ids.
    if (type === 'device') {
      await peer.getByTestId('join-identity').click();
    }
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input`).type(invitation);
    await this.page.keyboard.press('Enter');
  }

  async getAuthenticationCode(): Promise<string> {
    this._authenticationCode = new Trigger<string>();
    return await this._authenticationCode.wait();
  }

  peer(id: number) {
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
