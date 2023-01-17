//
// Copyright 2023 DXOS.org
//

import { Browser } from 'playwright';

import { getBrowser } from '../browser';
import { BrowserType } from '../types';

export type TestsContext = {
  browser: Browser;
};

type MochaHooks = {
  beforeAll: () => Promise<void>;
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks & Partial<TestsContext> = {
  async beforeAll() {
    const browser = await getBrowser(process.env.MOCHA_ENV as BrowserType).launch({
      headless: process.env.HEADLESS !== 'false'
    });

    this.browser = browser;
  },

  async afterAll() {
    if (process.env.STAY_OPEN !== 'true') {
      await this.browser?.close();
    }
  }
};
