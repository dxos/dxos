//
// Copyright 2023 DXOS.org
//

import type { Browser, ConsoleMessage } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { type Invitation } from '@dxos/react-client/invitations';
import { ConnectionState } from '@dxos/react-client/mesh';
import { setupPage } from '@dxos/test/playwright';

import { ScopedShellManager } from '../testing';

// TODO(wittjosiah): Factor out.
// TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

export type PanelType = number | 'identity' | 'devices' | 'spaces' | 'join';

export class InvitationsManager extends ScopedShellManager {
  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();

  constructor(private readonly _browser: Browser) {
    super();
  }

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      url: storybookUrl('invitations--default'),
      waitFor: (page) => page.getByTestId('invitations.identity-header').first().isVisible(),
    });

    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this._initialized = true;
  }

  async closePage() {
    await this.page.close();
  }

  // Getters

  peer(id: number) {
    return this.page.getByTestId(`peer-${id}`);
  }

  async getNetworkStatus(id: number) {
    const selector = this.peer(id).getByTestId('identity-list-item.description').first();

    try {
      await selector.waitFor({ timeout: 500 });
      return ConnectionState.OFFLINE;
    } catch {
      return ConnectionState.ONLINE;
    }
  }

  async getDisplayName(id: number) {
    // TODO(wittjosiah): Update id.
    return this.peer(id).getByTestId('identity-list-item').first().textContent();
  }

  async getSpaceName(id: number, nth: number) {
    // TODO(wittjosiah): Update id.
    return this.peer(id).getByTestId('space-list-item').nth(nth).textContent();
  }

  async getSpaceMembersCount(id: number) {
    return this.peer(id).getByTestId('space-members-list').locator('li').count();
  }

  async getAuthCode(): Promise<string> {
    return await this._authCode.wait();
  }

  // Actions

  async toggleNetworkStatus(id: number) {
    await this.peer(id).getByTestId('invitations.toggle-network').click();
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

  async createInvitation(id: number, type: 'device' | 'space', options?: Partial<Invitation>): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();

    if (!options) {
      const peer = this.peer(id);
      await peer.getByTestId(`${type}s-panel.create-invitation`).click();
      return this._invitationCode.wait();
    }

    await this.page.evaluate(
      ({ id, type, options }) => {
        if (type === 'device') {
          (window as any)[`peer${id}CreateHaloInvitation`](options);
        } else {
          (window as any)[`peer${id}CreateSpaceInvitation`](options);
        }
      },
      { id, type, options },
    );
    return this._invitationCode.wait();
  }

  async acceptInvitation(id: number, type: 'device' | 'space', invitation: string) {
    const peer = this.peer(id);
    // TODO(wittjosiah): Update ids.
    if (type === 'device') {
      await peer.getByTestId('identity-chooser.join-identity').click();
    }
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input`).waitFor({ timeout: 500 });
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input`).fill(invitation);
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input-continue`).click();
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
