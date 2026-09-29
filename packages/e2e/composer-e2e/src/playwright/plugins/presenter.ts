//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

const PLUGIN_ID = 'org.dxos.plugin.presenter';

export const Presenter = {
  /** The presenter is off by default. */
  enable: async (page: Page) => {
    const { rejected } = await page.evaluate(
      async (ids) =>
        (await globalThis.composer!.invoke!('org.dxos.operation.registry.enablePlugins', { ids })) as {
          rejected: unknown[];
        },
      [PLUGIN_ID],
    );
    expect(rejected, 'the presenter plugin must be in the bundle under test').toEqual([]);
  },

  companionTab: (page: Page) => page.getByTestId('deck.companion.tab.presenter'),

  /** Opens the plank's companion on the presenter tab; the companion may already be open on another tab. */
  openCompanion: async (plank: Locator) => {
    const tab = Presenter.companionTab(plank.page());
    const toggle = plank.getByTestId('plankHeading.companion');
    await tab.or(toggle).first().waitFor();
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    await tab.click();
  },

  /** Toggles presentation from the object's navtree actions menu. */
  togglePresenting: async (row: Locator) => {
    await row.hover();
    await row
      .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
      .first()
      .click();
    await row.page().getByTestId('presenter.present').click();
  },

  deck: (page: Page) => page.getByTestId('presenter.deck'),

  /** The slide Reveal is showing; `present` is Reveal's own marker for it. */
  currentSlide: (page: Page) => Presenter.deck(page).locator('.slides section.present'),
};
