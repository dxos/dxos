//
// Copyright 2023 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';

import config from '../../config.t';

export default defineTemplate(
  ({ input: { react } }) => {
    return !react ? null : text /* javascript */ `
    import type { Browser, BrowserContext, ConsoleMessage, Page } from 'playwright';

    import { Trigger } from '@dxos/async';
    import { ShellManager } from '@dxos/vault/testing';

    const BASE_URL = process.env.NODE_ENV === 'production' ? 'http://localhost:4173' : 'http://localhost:5173';

    export class AppManager {
      context!: BrowserContext;
      page!: Page;
      shell!: ShellManager;

      private _invitationCode = new Trigger<string>();
      private _authCode = new Trigger<string>();

      constructor(private readonly _browser: Browser | BrowserContext) {}

      async init() {
        this.context = 'newContext' in this._browser ? await this._browser.newContext() : this._browser;
        this.page = await this.context.newPage();
        this.page.on('console', (message) => this._onConsoleMessage(message));
        this.shell = new ShellManager(this.page);

        await this.page.goto(BASE_URL);

        await new Promise<void>((resolve) => {
          const interval = setInterval(async () => {
            const res = await this.isAppWorksVisible();
            if (res) {
              clearInterval(interval);
              resolve();
            }
          }, 1000);
        });
      }

      // Getters

      isAppWorksVisible(): Promise<boolean> {
        return this.page.getByTestId('welcome.appWorks').isVisible();
      }

      isCounterVisible(): Promise<boolean> {
        return this.page.getByTestId('counter').isVisible();
      }

      isHelloVisible(name: string): Promise<boolean> {
        return this.page.getByTestId('counter').getByText(\`Hello \$\{name\}\`).isVisible();
      }

      async currentCount(): Promise<number> {
        return Number(await this.page.getByTestId('counter.button').getAttribute('data-count'));
      }

      // Actions

      async login() {
        await this.page.getByTestId('welcome.login').click();
      }

      async increment() {
        await this.page.getByTestId('counter.button').click();
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
    `;
  },
  { config }
);
