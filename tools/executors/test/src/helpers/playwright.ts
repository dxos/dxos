//
// Copyright 2023 DXOS.org
//

import type { Browser } from 'playwright';

export const setupPage = async (browser: Browser, url?: string) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  if (url) {
    await page.goto(url);
  }

  return { context, page };
};
