//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { sleep } from '@dxos/async';

import { AppManager } from './app-manager';

test.describe('Demo', () => {
  let app: AppManager;

  test.beforeAll(async ({ browser }) => {
    app = new AppManager(browser);

    await app.init();
  });

  test('peers can see cursors', async () => {
    expect(await app.getCollaboratorCursors().count()).toEqual(0);

    await app.getMarkdownTextbox(0).focus();
    await app.getMarkdownTextbox(1).focus();

    await expect(app.getCollaboratorCursors().first()).not.toBeEmpty();
    await expect(app.getCollaboratorCursors().first()).not.toBeEmpty();
  });

  test('peers can see changes', async () => {
    await app.getMarkdownTextbox(0).focus();
    await app.page.keyboard.press('End');
    await app.page.keyboard.press('Enter');
    await app.getMarkdownTextbox(0).type('hello');
    await app.getMarkdownTextbox(1).getByText('hello').waitFor();

    // Wait for the cursor to disappear in order for text content to not include the cursor.
    await app.getMarkdownTextbox(0).blur();
    await expect(app.getCollaboratorCursors()).toHaveCount(0);
    const content0 = await app.getMarkdownTextbox(0).textContent();
    const content1 = await app.getMarkdownTextbox(1).textContent();
    expect(content0).toEqual(content1);
  });

  test.skip('airplane mode', async () => {
    await app.toggleAirplaneMode();
    await sleep(5_000);

    await app.getMarkdownTextbox(0).focus();
    await app.page.keyboard.press('End');
    await app.page.keyboard.press('Enter');
    await app.getMarkdownTextbox(0).type('hello');

    // Wait for the cursor to disappear in order for text content to not include the cursor.
    await app.getMarkdownTextbox(0).blur();
    await expect(app.getCollaboratorCursors()).toHaveCount(0);
    const offline0 = await app.getMarkdownTextbox(0).textContent();
    const offline1 = await app.getMarkdownTextbox(1).textContent();
    expect(offline0).not.toEqual(offline1);

    await app.toggleAirplaneMode();
    // TODO(wittjosiah): Works when inspecting, but text does not replicate when running headless for some reason.
    await app.getMarkdownTextbox(1).getByText('hello').waitFor({ timeout: 5_000 });
    const online0 = await app.getMarkdownTextbox(0).textContent();
    const online1 = await app.getMarkdownTextbox(1).textContent();
    expect(online0).toEqual(online1);
  });

  test.skip('batching', async () => {
    // TODO
  });
});
