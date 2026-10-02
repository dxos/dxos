//
// Copyright 2026 DXOS.org
//

import { type Page, type Request, expect } from '@playwright/test';

/** How long no script may be requested before the idle wave's preloads count as finished. */
const SCRIPTS_QUIET_PERIOD = 1_000;

/** Upper bound on the idle wave: `whenIdle` itself backstops at 15s. */
const SCRIPTS_SETTLED_TIMEOUT = 30_000;

/** The command palette (`navtree`) and the search dialog (`search`), both driven from the keyboard. */
export const Commands = {
  palette: (page: Page) => page.getByTestId('navtree.commands'),
  paletteInput: (page: Page) => page.getByTestId('navtree.commands.input'),
  search: (page: Page) => page.getByTestId('search.dialog'),
  searchInput: (page: Page) => page.getByTestId('search.dialog.input'),

  /** `meta+shift+k` / `ctrl+shift+k`. */
  openPalette: async (page: Page) => {
    await page.keyboard.press('ControlOrMeta+Shift+KeyK');
  },

  /** `meta+k` / `ctrl+k`. */
  openSearch: async (page: Page) => {
    await page.keyboard.press('ControlOrMeta+KeyK');
  },

  /** The command row the palette highlights, which is what Enter runs. */
  highlighted: (page: Page) => Commands.palette(page).locator('[role="option"][aria-selected="true"]'),

  /** Moves the palette's highlight down until it rests on the command with `testId`. */
  highlight: async (page: Page, testId: string) => {
    const target = Commands.palette(page).getByTestId(testId);
    await expect(target).toBeVisible();
    const count = await Commands.palette(page).locator('[role="option"]').count();
    for (let step = 0; step <= count; step++) {
      if ((await target.getAttribute('aria-selected')) === 'true') {
        return;
      }
      await page.keyboard.press('ArrowDown');
    }
    throw new Error(`palette never highlighted ${testId}`);
  },

  /**
   * Resolves once no script has been requested for {@link SCRIPTS_QUIET_PERIOD}: boot and the idle
   * wave, which carries the dialog preloads, are then done.
   */
  waitForScriptsSettled: async (page: Page) => {
    let last = Date.now();
    const onRequest = (request: Request) => {
      if (request.resourceType() === 'script') {
        last = Date.now();
      }
    };
    page.on('request', onRequest);
    try {
      await expect
        .poll(() => Date.now() - last >= SCRIPTS_QUIET_PERIOD, { timeout: SCRIPTS_SETTLED_TIMEOUT })
        .toBe(true);
    } finally {
      page.off('request', onRequest);
    }
  },

  /** Runs `open` and returns the URL of every script the page requested until `ready` resolved. */
  scriptsRequestedWhile: async (page: Page, open: () => Promise<void>, ready: () => Promise<void>) => {
    const scripts: string[] = [];
    const onRequest = (request: Request) => {
      if (request.resourceType() === 'script') {
        scripts.push(request.url());
      }
    };
    page.on('request', onRequest);
    try {
      await open();
      await ready();
    } finally {
      page.off('request', onRequest);
    }
    return scripts;
  },
};
