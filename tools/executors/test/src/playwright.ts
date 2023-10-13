//
// Copyright 2023 DXOS.org
//

import {
  type Browser,
  devices,
  type LaunchOptions,
  type PlaywrightTestConfig,
  type Project,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { v4 } from 'uuid';

import { getBrowser } from './browser';
import { type BrowserType, type MobileType } from './types';
import { Lock } from './util';

export type { BrowserType } from './types';

export type SetupOptions = {
  url?: string;
  waitFor?: (page: Page) => Promise<boolean>;
  bridgeLogs?: boolean;
};

// TODO(wittjosiah): Reconcile with getNewBrowserContext.
export const getPersistentContext = (browserType: BrowserType) => {
  const options: LaunchOptions = {
    headless: process.env.HEADLESS !== 'false',
    args:
      // NOTE: Playwright does not support extensions in headless mode.
      process.env.EXTENSION_PATH && process.env.HEADLESS === 'false'
        ? [
            `--disable-extensions-except=${process.env.EXTENSION_PATH}`,
            `--load-extension=${process.env.EXTENSION_PATH}`,
          ]
        : undefined,
  };

  return getBrowser(browserType).launchPersistentContext(`/tmp/playwright/${v4()}`, options);
};

export const setupPage = async (browser: Browser | BrowserContext, options: SetupOptions) => {
  const executorResult = JSON.parse(process.env.EXECUTOR_RESULT ?? '{}');
  const { url = executorResult.baseUrl, waitFor, bridgeLogs } = options;

  const context = 'newContext' in browser ? await browser.newContext() : browser;
  const page = await context.newPage();

  if (bridgeLogs) {
    const lock = new Lock();

    page.on('pageerror', async (error) => {
      await lock.executeSynchronized(async () => {
        console.log(error);
      });
    });

    page.on('console', async (msg) => {
      try {
        const argsPromise = Promise.all(msg.args().map((x) => x.jsonValue()));
        await lock.executeSynchronized(async () => {
          const args = await argsPromise;

          if (args.length > 0) {
            console.log(...args);
          } else {
            console.log(msg);
          }
        });
      } catch (err) {
        console.error('Failed to parse message', err);
      }
    });
  }

  if (url) {
    await page.goto(url);
  }

  if (waitFor) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        const res = await waitFor(page);
        if (res) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  return { context, page };
};

export const extensionId = async (context: BrowserContext) => {
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  return extensionId;
};

const getProject = (browser: BrowserType | MobileType): Project => {
  switch (browser) {
    case 'chromium':
    case 'firefox':
    case 'webkit':
      return {
        name: browser,
        use: {
          browserName: browser,
        },
      };

    case 'android':
      return {
        name: 'android',
        use: {
          ...devices['Pixel 5'],
        },
      };

    case 'ios':
      return {
        name: 'ios',
        use: {
          ...devices['iPhone SE'],
        },
      };
  }
};

export const defaultPlaywrightConfig: PlaywrightTestConfig = {
  testDir: '.',
  outputDir: process.env.OUTPUT_PATH,
  timeout: process.env.TIMEOUT ? Number(process.env.TIMEOUT) : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter:
    process.env.WATCH === 'true'
      ? [['dot']]
      : process.env.RESULTS_PATH
      ? [['list'], ['junit', { outputFile: process.env.RESULTS_PATH }]]
      : [['list']],
  use: {
    headless: process.env.HEADLESS !== 'false',
    trace: 'retain-on-failure',
  },
  projects: process.env.BROWSERS?.split(',').map((browser) => getProject(browser as BrowserType)),
};
