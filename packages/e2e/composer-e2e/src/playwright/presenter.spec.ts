//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';
import { Markdown, Presenter } from './plugins/index.ts';

test.describe('Presenter', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
    await Presenter.enable(host.page);
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('preview a document in the companion, then present it', { tag: ['@presenter:QA-1'] }, async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });
    const plank = host.deck.plank();
    await Markdown.getMarkdownTextboxWithLocator(plank.locator).fill('# Alpha\n\n---\n\n# Beta');

    await Presenter.openCompanion(plank.locator);
    await expect(Presenter.currentSlide(host.page)).toContainText('Alpha');
    await expect(host.page).toHaveURL(/\/companion\/presenter$/);
    const url = host.page.url();

    await Presenter.togglePresenting(host.getObjectByName('Alpha'));
    await expect(host.deck.viewport()).toBeHidden();
    await expect(Presenter.companionTab(host.page)).toBeHidden();
    await expect(Presenter.currentSlide(host.page)).toContainText('Alpha');
    await expect
      .poll(
        async () =>
          ((await Presenter.deck(host.page).boundingBox())?.width ?? 0) / (host.page.viewportSize()?.width ?? 1),
      )
      .toBeGreaterThan(0.95);
    await expect(host.page).toHaveURL(url);

    await host.page.keyboard.press('Escape');
    await expect(host.deck.viewport()).toBeVisible();
    await expect(Presenter.companionTab(host.page)).toBeVisible();
    await expect(Presenter.currentSlide(host.page)).toContainText('Alpha');
    await expect(host.page).toHaveURL(url);
  });
});
