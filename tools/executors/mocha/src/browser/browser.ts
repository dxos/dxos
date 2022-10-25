//
// Copyright 2022 DXOS.org
//

import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import { v4 } from 'uuid';

export const BrowserTypes = ['chromium', 'firefox', 'webkit'] as const;

export type BrowserType = typeof BrowserTypes[number];

export type BrowserOptions = {
  headless: boolean;
  debug: boolean;
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

export const getNewBrowserContext = async (
  browserType: BrowserType,
  options: BrowserOptions
) => {
  const userDataDir = `/tmp/browser-mocha/${v4()}`;
  await mkdir(userDataDir, { recursive: true });

  const browserRunner = getBrowser(browserType);
  const context = await browserRunner.launchPersistentContext(userDataDir, {
    headless: options.headless,
    args: [
      ...(options.debug ? ['--auto-open-devtools-for-tabs'] : []),
      ...(options.browserArgs ?? [])
    ]
  });
  const page = await context.newPage();

  return {
    browserType,
    context,
    page
  };
};
