//
// Copyright 2023 DXOS.org
//

/* eslint-disable no-console */

import {
  type Browser,
  devices,
  type PlaywrightTestConfig,
  type Project,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import { Lock } from './lock';
import { type BrowserType, type MobileType } from './types';

export type SetupOptions = {
  url?: string;
  /** @deprecated Use native playwright `waitFor` method on a locator. */
  waitFor?: (page: Page) => Promise<boolean>;
  bridgeLogs?: boolean;
};

export const setupPage = async (browser: Browser | BrowserContext, options: SetupOptions = {}) => {
  const executorResult = JSON.parse(process.env.EXECUTOR_RESULT ?? '{}');
  const { url = executorResult.baseUrl, waitFor, bridgeLogs } = options;

  const context = 'newContext' in browser ? await browser.newContext() : browser;
  const page = await context.newPage();

  if (bridgeLogs) {
    const lock = new Lock();

    page.on('pageerror', async (error) => {
      await lock.executeSynchronized(async () => {
        // eslint-disable-next-line no-console
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

  return { context, page, initialUrl: url };
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
  workers: 6,
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
