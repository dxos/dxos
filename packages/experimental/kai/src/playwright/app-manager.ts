//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { ConsoleMessage, Page } from 'playwright';

import { Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/halo-app';
import { setupPage } from '@dxos/test';

// TODO(wittjosiah): Get this from executor.
const BASE_URL = 'http://localhost:4200';

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
      url: BASE_URL,
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
    const url = await this.page.url();
    return url.split('/').find((part) => part.includes('...'));
  }

  async kaiIsVisible() {
    return await this.page.getByTestId('kai-bug').isVisible();
  }

  // Actions

  // TODO

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
