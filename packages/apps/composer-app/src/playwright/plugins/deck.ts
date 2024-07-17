//
// Copyright 2024 DXOS.org
//

import { type Page, type Locator } from '@playwright/test';

// TODO(Zan): Extend this with other plank types.
type PlankKind = 'markdown' | 'collection' | 'unknown';

// Define a plank manager that takes a page and provides a way to interact with planks.
// TODO(wittjosiah): Factor out to react-ui-deck.
export class DeckManager {
  constructor(private readonly _page: Page) {}

  plank(nth = 0) {
    return new PlankManager(this._page.getByTestId('deck.plank').nth(nth));
  }

  async closeAll() {
    const planks = await this._page.getByTestId('deck.plank').all();
    // Iterate in reverse to avoid re-indexing.
    for (const plank of planks.reverse()) {
      await closePlank(plank);
    }
  }
}

export class PlankManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  async close() {
    await closePlank(this.locator);
  }

  async kind() {
    return classifyArticleElement(this.locator);
  }

  async qualifiedId() {
    return this.locator.getAttribute('data-attendable-id');
  }

  membersPresence() {
    return this.locator.getByTestId('spacePlugin.presence.member');
  }
}

const closePlank = async (locator: Locator) => locator.getByTestId('plankHeading.close').click();

const classifyArticleElement = async (locator: Locator): Promise<PlankKind> => {
  // NOTE: Stack should be checked first since stacks can contain many types.
  if ((await locator.getByTestId('main.stack').count()) === 1) {
    return 'collection';
  }

  if ((await locator.getByTestId('composer.markdownRoot').count()) === 1) {
    return 'markdown';
  }

  // When you need to support a certain kind of plank, add a classifier here.

  return 'unknown';
};
