//
// Copyright 2026 DXOS.org
//

import { type Page, expect } from '@playwright/test';

export const Support = {
  card: (page: Page) => page.getByTestId('helpPlugin.tooltip'),
  title: (page: Page) => page.getByTestId('helpPlugin.tooltip.title'),

  next: (page: Page) => page.getByTestId('helpPlugin.tooltip.next'),
  back: (page: Page) => page.getByTestId('helpPlugin.tooltip.back'),
  finish: (page: Page) => page.getByTestId('helpPlugin.tooltip.finish'),
  close: (page: Page) => page.getByTestId('helpPlugin.tooltip.close'),

  openSpaceHome: async (page: Page) => {
    await page.getByTestId('spacePlugin.spaceHome').first().click();
  },

  startGlobal: async (page: Page) => {
    await Support.openSpaceHome(page);
    await page.getByTestId('supportPlugin.startTour').click();
  },

  awaitFragments: async (page: Page) => {
    await page.getByTestId('comments.comment.add').first().waitFor({ state: 'visible' });
    await page.getByTestId('transcription.record').first().waitFor({ state: 'visible' });
  },

  startFromCompanion: async (page: Page) => {
    await page.getByTestId('supportPlugin.startCompanionTour').first().click();
  },

  /** Steps through a running tour from its first step to Finish, asserting every title on the way. */
  walk: async (page: Page, titles: readonly string[]) => {
    for (const [index, title] of titles.entries()) {
      if (index > 0) {
        await Support.next(page).click();
      }
      await expect(Support.title(page)).toHaveText(title);
    }

    await Support.finish(page).click();
    await expect(Support.card(page)).not.toBeVisible();
  },
};
