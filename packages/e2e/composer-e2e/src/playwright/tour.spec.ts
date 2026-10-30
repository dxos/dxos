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

  test('a document tour picks up contributed steps, however the toolbar collapses', { tag: ['@QA-9'] }, async () => {
    test.slow();

    await host.createSpace();
    await host.createObject({ type: 'Document' });

    await expect(host.page.getByTestId('deck.companion')).toBeVisible();

    await Support.awaitFragments(host.page);
    await Support.startFromCompanion(host.page);
    await Support.walk(host.page, DOCUMENT_TOUR);

    await host.page.setViewportSize({ width: 1200, height: 800 });
    await expect(host.page.getByTestId('editor.toolbar.viewMode')).toBeHidden();
    await Support.startFromCompanion(host.page);
    await Support.walk(host.page, DOCUMENT_TOUR);

    await host.page.reload();
    await Support.startGlobal(host.page);
    await Support.walk(host.page, GLOBAL_TOUR);
  });

  test('leaving a document ends its tour', { tag: ['@QA-9'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    await Support.startFromCompanion(host.page);
    await expect(Support.title(host.page)).toHaveText(DOCUMENT_TOUR[0]);

    // The tour's backdrop takes every click, so leave the way a boot onto Home does.
    const documentUrl = host.page.url();
    await host.page.goto(documentUrl.replace(/\/object\/.*$/, '/home'));
    await host.waitForBoot(new RegExp(`/w/${host.workspaceId}/home`));
    await expect(host.page.getByTestId('supportPlugin.startTour')).toBeVisible();

    await host.page.goto(documentUrl);
    await host.waitForBoot(new RegExp(new URL(documentUrl).pathname));
    await expect(host.page.getByTestId('editor.toolbar.strong')).toBeVisible();
    await expect(Support.card(host.page)).not.toBeVisible();

    await Support.startGlobal(host.page);
    await expect(Support.title(host.page)).toHaveText(GLOBAL_TOUR[0]);
  });
});
