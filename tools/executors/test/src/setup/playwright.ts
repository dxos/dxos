//
// Copyright 2023 DXOS.org
//

import { Browser, BrowserContext, LaunchOptions } from 'playwright';
import { v4 } from 'uuid';

import { getBrowser } from '../browser';
import { BrowserType } from '../types';

export type TestsContext = {
  browser: Browser;
  persistentContext: BrowserContext;
};

type MochaHooks = {
  beforeAll: () => Promise<void>;
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks & Partial<TestsContext> = {
  async beforeAll() {
    const options: LaunchOptions = {
      headless: process.env.HEADLESS !== 'false',
      args: process.env.EXTENSION_PATH
        ? [
            `--disable-extensions-except=${process.env.EXTENSION_PATH}`,
            `--load-extension=${process.env.EXTENSION_PATH}`
          ]
        : undefined
    };

    if (process.env.INCOGNITO === 'false') {
      const browser = await getBrowser(process.env.MOCHA_ENV as BrowserType).launch(options);
      this.browser = browser;
    } else {
      const persistentContext = await getBrowser(process.env.MOCHA_ENV as BrowserType).launchPersistentContext(
        `/tmp/playwright/${v4()}`,
        options
      );
      this.persistentContext = persistentContext;
    }
  },

  async afterAll() {
    if (process.env.STAY_OPEN !== 'true') {
      await this.browser?.close();
      await this.persistentContext?.close();
    }
  }
};
