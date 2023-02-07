//
// Copyright 2023 DXOS.org
//

import { test as base, chromium, webkit, BrowserContext } from '@playwright/test';
import path from 'path';

const extensionPath = path.join(__dirname, '../../out/devtools-extension'); // make sure this is correct

// https://playwright.dev/docs/chrome-extensions
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ browserName }, use) => {
    if (browserName === 'firefox') {
      return;
    }
    const browserTypes = { chromium, webkit };
    const launchOptions = {
      devtools: true,
      headless: false,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      viewport: {
        width: 1920,
        height: 1080
      }
    };
    const context = await browserTypes[browserName].launchPersistentContext('', launchOptions);
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  }
});

export const expect = test.expect;
