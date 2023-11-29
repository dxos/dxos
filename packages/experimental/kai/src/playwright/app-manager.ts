//
// Copyright 2023 DXOS.org
//

import type { Browser, ConsoleMessage, Page } from '@playwright/test';

import { Trigger } from '@dxos/async';
import { setupPage } from '@dxos/test/playwright';
import { ShellManager } from '@dxos/shell/testing';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();

  constructor(private readonly _browser: Browser) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, {
      waitFor: (page) => page.getByTestId('dxos-shell').isVisible(),
      bridgeLogs: true,
    });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this.shell = new ShellManager(this.page);
    this._initialized = true;
  }

  // Getters

  async currentSpace() {
    const url = new URL(await this.page.url());
    return url.pathname.split('/')[0];
  }

  async kaiIsVisible() {
    return await this.page.getByTestId('sidebar.spaceIcon').isVisible();
  }

  // Actions

  async showSpaceList() {
    await this.page.getByTestId('sidebar.showSpaceList').click();
  }

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
      } else if (json.authCode) {
        this._authCode.wake(json.authCode);
      }
    } catch {}
  }
}
