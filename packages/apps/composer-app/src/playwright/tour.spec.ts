//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Support } from './plugins/index.ts';

test.describe('Tour tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('the global tour runs from the Home help companion and advances', async () => {
    await Support.startGlobal(host.page);

    await expect(Support.card(host.page)).toBeVisible();
    await expect(Support.title(host.page)).toHaveText('Sharing');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Creating content');

    await Support.back(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Sharing');

    await Support.close(host.page).click();
    await expect(Support.card(host.page)).not.toBeVisible();
  });

  test('a document tour picks up steps contributed by other plugins', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    await expect(host.page.getByTestId('deck.companion')).toBeVisible();

    await Support.awaitFragments(host.page);
    await Support.startFromCompanion(host.page);
    await expect(Support.title(host.page)).toHaveText('Markdown, formatted as you type');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Search');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Modes');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Comments');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Dictate');

    await Support.finish(host.page).click();
    await expect(Support.card(host.page)).not.toBeVisible();

    await host.page.reload();
    await Support.startGlobal(host.page);
    await expect(Support.title(host.page)).toHaveText('Sharing');
  });
});
