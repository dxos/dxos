//
// Copyright 2023 DXOS.org
//

import type { Context } from 'mocha';
import type { Browser, Page } from 'playwright';

import { Lock } from '../util';

export type SetupOptions = {
  url?: string;
  waitFor?: (page: Page) => Promise<boolean>;
  timeout?: number;
  bridgeLogs?: boolean;
};

export const setupPage = async (mochaContext: Context, options: SetupOptions) => {
  const { url, waitFor, timeout = 30_000, bridgeLogs } = options;

  mochaContext.timeout(timeout);

  const browser = mochaContext.browser as Browser;
  const context = await browser.newContext();
  const page = await context.newPage();

  if (bridgeLogs) {
    const lock = new Lock();

    page.on('pageerror', async (error) => {
      await lock.executeSynchronized(async () => {
        console.log(error);
      });
    });

    page.on('console', async (msg) => {
      const argsPromise = Promise.all(msg.args().map((x) => x.jsonValue()));
      await lock.executeSynchronized(async () => {
        const args = await argsPromise;

        if (args.length > 0) {
          console.log(...args);
        } else {
          console.log(msg);
        }
      });
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
