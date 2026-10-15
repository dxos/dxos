//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

// Free of the harness and the app's packages, so a plain Node script can drive a page with them too.

export const waitForReady = async (page: Page, timeout = 120_000): Promise<void> => {
  await page.getByTestId('treeView.userAccount').waitFor({ timeout });
};

/** Invokes one operation in the page's own realm, the path a user's gesture takes. */
export const invokeInPage = (page: Page, key: string, input: unknown): Promise<unknown> =>
  page.evaluate(
    ({ key, input }) => {
      const composer = globalThis.composer;
      if (!composer?.invoke) {
        throw new Error('composer.invoke is unavailable');
      }
      return composer.invoke(key, input);
    },
    { key, input },
  );
