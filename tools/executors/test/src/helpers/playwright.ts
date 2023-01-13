//
// Copyright 2023 DXOS.org
//

import type { Context } from 'mocha';
import type { Browser, Page } from 'playwright';

export const setupPage = async (mochaContext: Context, url?: string, waitFor?: (page: Page) => Promise<boolean>) => {
  mochaContext.timeout(30_000);

  const browser = mochaContext.browser as Browser;
  const context = await browser.newContext();
  const page = await context.newPage();

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
