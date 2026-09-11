//
// Copyright 2024 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';
import { Tour } from './plugins';

// Started from the Home toolbar rather than on first run: the automatic trigger is part of the beta
// auth flow, which localhost does not go through, so the tour would never appear here on its own.
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
    await Tour.startGlobal(host.page);

    await expect(Tour.card(host.page)).toBeVisible();
    await expect(Tour.title(host.page)).toHaveText('Sharing');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Creating content');

    await Tour.back(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Sharing');

    await Tour.close(host.page).click();
    await expect(Tour.card(host.page)).not.toBeVisible();
  });

  test('a document tour picks up steps contributed by other plugins', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    // The document tour is `auto`, so opening the first document of the profile starts it. Asserting
    // the card first: a step whose target never resolves ends the tour instead of failing, so a bad
    // selector reads as "no tour" rather than as a wrong title.
    await expect(Tour.card(host.page)).toBeVisible();
    await expect(Tour.title(host.page)).toHaveText('Markdown, formatted as you type');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Search');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Modes');

    // Neither of these steps is markdown's. Comments come from plugin-review and dictation from
    // plugin-transcription, contributed as fragments because both features apply here.
    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Comments');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Dictate');

    await Tour.finish(host.page).click();
    await expect(Tour.card(host.page)).not.toBeVisible();

    // Replayed after a reload, which is the case a fresh profile never reaches: the running tour's
    // id is persisted, so on boot it names a tour before anything is attended. Composing then would
    // ask every fragment about an absent subject and cache a tour with no contributed steps.
    await host.page.reload();
    await expect(host.page.getByTestId('deck.companion')).toBeVisible();
    await Tour.startFromCompanion(host.page);
    await expect(Tour.title(host.page)).toHaveText('Markdown, formatted as you type');

    await Tour.next(host.page).click();
    await Tour.next(host.page).click();
    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Comments');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Dictate');
  });

  test('a project runs its own tour on first open, and again from the help companion', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Project' });

    // The pane comes up with the plank, on help, which is what puts the tour's button within reach.
    await expect(host.page.getByTestId('deck.companion')).toBeVisible();

    // The project tour is registered `auto`, so opening the first project of the profile starts it.
    await expect(Tour.card(host.page)).toBeVisible();
    await expect(Tour.title(host.page)).toHaveText('Overview');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Artifacts');

    // This step's `before` switches the article to Tasks, so reaching it proves a step can drive the UI.
    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Tasks');
    await expect(host.page.getByTestId('projectsPlugin.tab.tasks')).toHaveAttribute('data-state', 'active');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Hand work to an agent');

    await Tour.next(host.page).click();
    await expect(Tour.title(host.page)).toHaveText('Sessions');

    await Tour.finish(host.page).click();
    await expect(Tour.card(host.page)).not.toBeVisible();

    // Having run once it will not start itself again; the companion's toolbar is how it is replayed.
    await Tour.startFromCompanion(host.page);
    await expect(Tour.title(host.page)).toHaveText('Overview');
  });
});
