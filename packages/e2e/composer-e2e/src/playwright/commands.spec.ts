//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager } from './app-manager.ts';
import { Commands } from './plugins/index.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/** The palette command whose form dialog the form-focus flow opens. */
const CREATE_SPACE_COMMAND = 'spacePlugin.createSpace';

test.describe('Command palette and search', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('palette opens from the keyboard with the caret in its input', { tag: ['@QA-11'] }, async () => {
    const { page } = host;
    // Preloaded at idle: once it is, opening the palette must not wait on a chunk.
    await Commands.waitForPreload(host, 'CommandsDialogContent');
    const chunks = await Commands.dialogChunksRequestedWhile(
      page,
      () => Commands.openPalette(page),
      () => expect(Commands.paletteInput(page)).toBeFocused(),
    );
    expect(chunks).toEqual([]);
    await expect(Commands.highlighted(page)).toHaveCount(1);
  });

  test('escape closes the palette, also with a query typed', { tag: ['@QA-11'] }, async () => {
    const { page } = host;

    await Commands.openPalette(page);
    await expect(Commands.paletteInput(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(Commands.palette(page)).toHaveCount(0);

    // Reopening works, and Escape dismisses rather than clearing the query.
    await Commands.openPalette(page);
    await expect(Commands.paletteInput(page)).toBeFocused();
    await page.keyboard.type('space');
    await expect(Commands.paletteInput(page)).toHaveValue('space');
    await page.keyboard.press('Escape');
    await expect(Commands.palette(page)).toHaveCount(0);
  });

  test('a command that opens a form focuses its first field', { tag: ['@QA-11'] }, async () => {
    const { page } = host;

    await Commands.openPalette(page);
    await expect(Commands.paletteInput(page)).toBeFocused();
    await page.keyboard.type('space');
    await Commands.highlight(page, CREATE_SPACE_COMMAND);
    await page.keyboard.press('Enter');

    const dialog = page.getByTestId('create-space-dialog');
    await expect(dialog).toBeVisible();
    await expect(Commands.palette(page)).toHaveCount(0);
    const firstField = page.getByTestId('create-space-form').locator('input').first();
    await expect(firstField).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('search opens from the keyboard and escape closes it', { tag: ['@QA-11'] }, async () => {
    const { page } = host;
    await Commands.waitForPreload(host, 'SearchDialog');
    const chunks = await Commands.dialogChunksRequestedWhile(
      page,
      () => Commands.openSearch(page),
      () => expect(Commands.searchInput(page)).toBeFocused(),
    );
    expect(chunks).toEqual([]);

    await page.keyboard.type('readme');
    await expect(Commands.searchInput(page)).toHaveValue('readme');
    await page.keyboard.press('Escape');
    await expect(Commands.search(page)).toHaveCount(0);

    await Commands.openSearch(page);
    await expect(Commands.searchInput(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(Commands.search(page)).toHaveCount(0);
  });
});
