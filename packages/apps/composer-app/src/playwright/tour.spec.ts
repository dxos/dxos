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

  test('the global tour runs from the Home toolbar and advances', async () => {
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

    await expect(Support.card(host.page)).toBeVisible();
    await expect(Support.title(host.page)).toHaveText('Markdown, formatted as you type');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Search');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Modes');

    // Fragments: Comments from plugin-review, Dictate from plugin-transcription.
    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Comments');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Dictate');

    await Support.finish(host.page).click();
    await expect(Support.card(host.page)).not.toBeVisible();

    // Replayed after a reload: the running tour's id is persisted and names a tour before anything
    // is attended.
    await host.page.reload();
    await expect(host.page.getByTestId('deck.companion')).toBeVisible();
    await Support.startFromCompanion(host.page);
    await expect(Support.title(host.page)).toHaveText('Markdown, formatted as you type');

    await Support.next(host.page).click();
    await Support.next(host.page).click();
    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Comments');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Dictate');
  });

  test('a project runs its own tour on first open, and again from the help companion', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Project' });

    await expect(host.page.getByTestId('deck.companion')).toBeVisible();

    await expect(Support.card(host.page)).toBeVisible();
    await expect(Support.title(host.page)).toHaveText('Overview');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Artifacts');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Tasks');
    await expect(host.page.getByTestId('projectsPlugin.tab.tasks')).toHaveAttribute('data-state', 'active');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Hand work to an agent');

    await Support.next(host.page).click();
    await expect(Support.title(host.page)).toHaveText('Sessions');

    await Support.finish(host.page).click();
    await expect(Support.card(host.page)).not.toBeVisible();

    await Support.startFromCompanion(host.page);
    await expect(Support.title(host.page)).toHaveText('Overview');
  });
});
