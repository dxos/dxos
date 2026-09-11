//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

/**
 * The guided-tour card and the two ways a tour starts: the Home toolbar action for the app's global
 * tour, and the help companion's toolbar for a tour belonging to the open object's type.
 */
export const Tour = {
  card: (page: Page) => page.getByTestId('helpPlugin.tooltip'),
  title: (page: Page) => page.getByTestId('helpPlugin.tooltip.title'),

  next: (page: Page) => page.getByTestId('helpPlugin.tooltip.next'),
  back: (page: Page) => page.getByTestId('helpPlugin.tooltip.back'),
  finish: (page: Page) => page.getByTestId('helpPlugin.tooltip.finish'),
  close: (page: Page) => page.getByTestId('helpPlugin.tooltip.close'),

  /** Opens the default space's Home article, which carries the global tour's action. */
  openSpaceHome: async (page: Page) => {
    await page.getByTestId('spacePlugin.spaceHome').first().click();
  },

  startGlobal: async (page: Page) => {
    await Tour.openSpaceHome(page);
    await page.getByTestId('supportPlugin.startTour').click();
  },

  /** Starts a tour from the help companion of the open plank. */
  startFromCompanion: async (page: Page) => {
    await page.getByTestId('supportPlugin.startCompanionTour').first().click();
  },
};
