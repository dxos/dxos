//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Support } from './plugins/index.ts';

const GLOBAL_TOUR = ['Sharing', 'Creating content', 'Profile', 'Settings', 'Plugins', 'Companions', 'Feedback'];

// Comments and Dictate are contributed by plugin-review and plugin-transcription.
const DOCUMENT_TOUR = ['Markdown, formatted as you type', 'Search', 'Modes', 'Comments', 'Dictate'];

test.describe('Tour tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('the global tour runs from the Home help companion and advances', { tag: ['@QA-9'] }, async () => {
    await Support.startGlobal(host.page);

    await expect(Support.title(host.page)).toHaveText(GLOBAL_TOUR[0]);
    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText(GLOBAL_TOUR[1]);
    await Support.back(host.page).click();

    await Support.walk(host.page, GLOBAL_TOUR);
  });

  test('a document tour picks up steps contributed by other plugins', { tag: ['@QA-9'] }, async () => {
    test.slow();

    await host.createSpace();
    await host.createObject({ type: 'Document' });

    await expect(host.page.getByTestId('deck.companion')).toBeVisible();

    await Support.awaitFragments(host.page);
    await Support.startFromCompanion(host.page);
    await Support.walk(host.page, DOCUMENT_TOUR);

    await host.page.reload();
    await Support.startGlobal(host.page);
    await Support.walk(host.page, GLOBAL_TOUR);
  });
});
