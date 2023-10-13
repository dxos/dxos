//
// Copyright 2022 DXOS.org
//

import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { v4 } from 'uuid';

import { type BrowserType } from '../types';

export type BrowserOptions = {
  headless: boolean;
  browserArgs?: string[];
};

export const getBrowser = (browserType: BrowserType) => {
  switch (browserType) {
    case 'chromium':
      return chromium;
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      throw new Error(`Unsupported browser: ${browserType}`);
  }
};

export const getNewBrowserContext = async (browserType: BrowserType, options: BrowserOptions) => {
  const userDataDir = `/tmp/browser-mocha/${v4()}`;
  await mkdir(userDataDir, { recursive: true });

  const browserRunner = getBrowser(browserType);
  const context = await browserRunner.launchPersistentContext(userDataDir, {
    headless: options.headless,
    args: [...(options.headless ? [] : ['--auto-open-devtools-for-tabs']), ...(options.browserArgs ?? [])],
  });
  const page = await context.newPage();

  return {
    browserType,
    context,
    page,
  };
};
