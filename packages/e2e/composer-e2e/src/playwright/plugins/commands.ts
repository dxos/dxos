//
// Copyright 2026 DXOS.org
//

import { type Page, type Request, expect } from '@playwright/test';

import { type AppManager } from '../app-manager.ts';

/** Upper bound on the idle wave, which carries the preloads: `whenIdle` itself backstops at 15s. */
const PRELOAD_TIMEOUT = 30_000;

/**
 * The chunks the two dialogs and the search handler are built into, named after their modules. Only
 * these are asserted on: the app loads unrelated chunks on its own schedule (onboarding provisions an
 * EDGE agent after boot), which says nothing about whether opening a dialog waits on a fetch.
 */
const DIALOG_CHUNK = /\/assets\/(CommandsDialogContent|SearchDialog|open-search)-[\w-]+\.js$/;

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

  /** Resolves once the app has fetched the chunk built from `module` — the idle preload, for a dialog. */
  waitForPreload: async (host: AppManager, module: 'CommandsDialogContent' | 'SearchDialog') => {
    await expect
      .poll(() => [...host.requestedScripts()].some((pathname) => pathname.startsWith(`/assets/${module}-`)), {
        timeout: PRELOAD_TIMEOUT,
      })
      .toBe(true);
  },

  /** Runs `open` and returns the URL of every dialog chunk the page requested until `ready` resolved. */
  dialogChunksRequestedWhile: async (page: Page, open: () => Promise<void>, ready: () => Promise<void>) => {
    const scripts: string[] = [];
    const onRequest = (request: Request) => {
      if (request.resourceType() === 'script' && DIALOG_CHUNK.test(request.url())) {
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
