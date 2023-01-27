//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { ConsoleMessage, Page } from 'playwright';

import { sleep, synchronized, Trigger } from '@dxos/async';
import { setupPage } from '@dxos/test';

// TODO(wittjosiah): Get this from executor.
const BASE_URL = 'http://localhost:4200';

export class AppManager {
  page!: Page;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();
  private _authenticationCode = new Trigger<string>();

  constructor(private readonly mochaContext: MochaContext) {}

  // Getters

  async currentSpace() {
    const url = await this.page.url();
    return url.split('/').find((part) => part.includes('...'));
  }

  async stackIsVisible() {
    await this._init();

    return (
      (await this.page.isVisible('a:has-text("Stack")')) &&
      (await this.page.isVisible('h2:text("Organizations")')) &&
      (await this.page.isVisible('h2:text("Contacts")')) &&
      (await this.page.isVisible('h2:text("Tasks")')) &&
      (await this.page.isVisible('h2:text("Projects")'))
    );
  }

  // Actions

  async createIdentity(name: string) {
    await this._init();
    await this.page.click('data-testid=create-identity-button');
    await this.page.keyboard.type(name);
    await this.page.keyboard.press('Enter');
    await sleep(500); // Allow time for redirect.
  }

  async shareSpace() {
    await this._init();
    this._invitationCode = new Trigger<string>();
    await this.page.click('data-testid=space-settings');
    await this.page.click('data-testid=create-invitation-button');
    return await this._invitationCode.wait();
  }

  async getAuthenticationCode() {
    await this._init();
    this._authenticationCode = new Trigger<string>();
    return await this._authenticationCode.wait();
  }

  async joinSpace(invitationCode: string) {
    await this._init();
    await this.page.goto(`${BASE_URL}/#/space/join?invitation=${invitationCode}`);
  }

  async authenticate(authenticationCode: string) {
    await this._init();
    await this.page.keyboard.type(authenticationCode);
  }

  @synchronized
  private async _init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this.mochaContext, {
      url: BASE_URL,
      waitFor: (page) => page.isVisible(':has-text("KAI")'),
      bridgeLogs: true
    });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this._initialized = true;
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
