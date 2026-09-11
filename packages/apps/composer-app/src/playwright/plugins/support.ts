//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

/** The guided-tour card, and the two controls that start a tour: Home's toolbar and the help companion's. */
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

  startFromCompanion: async (page: Page) => {
    await page.getByTestId('supportPlugin.startCompanionTour').first().click();
  },
};
