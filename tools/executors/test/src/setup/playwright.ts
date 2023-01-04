//
// Copyright 2023 DXOS.org
//

import { BrowserContext, Page } from 'playwright';

import { getNewBrowserContext } from '../browser';
import { BrowserType } from '../types';

export type TestsContext = {
  browserType: BrowserType;
  context: BrowserContext;
  page: Page;
};

type MochaHooks = {
  beforeAll: () => Promise<void>;
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks & Partial<TestsContext> = {
  async beforeAll() {
    const { browserType, context, page } = await getNewBrowserContext(process.env.MOCHA_ENV as BrowserType, {
      headless: process.env.HEADLESS !== 'false'
    });

    this.browserType = browserType;
    this.context = context;
    this.page = page;
  },

  async afterAll() {
    if (process.env.STAY_OPEN !== 'true') {
      await this.context?.close();
    }
  }
};
