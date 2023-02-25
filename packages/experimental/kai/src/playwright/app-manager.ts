//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { ConsoleMessage, Page } from 'playwright';

import { Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/halo-app/testing';
import { setupPage } from '@dxos/test';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authenticationCode = new Trigger<string>();

  constructor(private readonly mochaContext: MochaContext) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this.mochaContext, {
      url: mochaExecutor.executorResult.baseUrl,
      waitFor: (page) => page.getByTestId('create-identity').isVisible(),
      bridgeLogs: true
    });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this.shell = new ShellManager(this.page, false);
    this._initialized = true;
  }

  // Getters

  async currentSpace() {
    const url = new URL(await this.page.url());
    return url.pathname.split('/')[0];
  }

  async kaiIsVisible() {
    return await this.page.getByTestId('space-icon').isVisible();
  }

  // Actions

  async createSpace() {
    await this.page.getByTestId('sidebar.createSpace').click();
  }

  async openJoinSpace() {
    await this.page.getByTestId('sidebar.joinSpace').click();
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
