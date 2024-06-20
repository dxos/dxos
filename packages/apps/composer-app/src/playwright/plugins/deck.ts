//
// Copyright 2024 DXOS.org
//

import { type Page, type Locator } from '@playwright/test';

// NOTE: `.all` returns a set of locators chained with `.nth()` calls.
const getPlankArticles = async (page: Page): Promise<Locator[]> => page.getByTestId('deckPlugin.plank').all();

// TODO(Zan): Extend this with other plank types.
type PlankKind = 'markdown' | 'collection' | 'unknown';

type Plank = {
  kind: PlankKind;
  locator: Locator;
  qualifiedId?: string;
};

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

type GetPlanksOptions = Partial<{ filter: PlankKind }>;

/**
 * NOTE(Zan): With the way `.all()` works, it builds a set of locators based on `.nth()` calls.
 * - This means that if planks are opened or closed, the locators *may* become invalid.
 * - I'm not sure how to model this yet, I wonder if there's a more elegant way to handle this.
 * - For now: calling `getPlanks` is a real POINT IN TIME snapshot.
 */
const getPlanks = async (page: Page): Promise<Plank[]> => {
  const locators = await getPlankArticles(page);
  const results: Plank[] = [];

  for (const articleLocator of locators) {
    results.push({
      kind: await classifyArticleElement(articleLocator),
      locator: articleLocator,
      qualifiedId: (await articleLocator.getAttribute('data-attendable-id')) ?? undefined,
    });
  }

  return results;
};

const closePlank = async (locator: Locator) => locator.getByTestId('plankHeading.close').click();

const getPlankPresence = (locator: Locator) => {
  return locator.getByTestId('spacePlugin.presence.member').evaluateAll((elements) => {
    const viewing = elements.filter((element) => element.getAttribute('data-status') === 'current').length;
    const active = elements.filter((element) => element.getAttribute('data-status') === 'active').length;

    return {
      viewing,
      active,
    };
  });
};

// Define a plank manager that takes a page and provides a way to interact with planks.
export class PlankManager {
  planks: Plank[] = [];

  constructor(private readonly _page: Page) {}

  private async updatePlanks() {
    this.planks = await getPlanks(this._page);
  }

  async getPlanks(options?: GetPlanksOptions): Promise<Plank[]> {
    await this.updatePlanks();
    return options?.filter ? this.planks.filter((plank) => plank.kind === options.filter) : this.planks;
  }

  async getPlankPresence(plankId: string | undefined) {
    if (!plankId) {
      return undefined;
    }

    await this.updatePlanks();
    const plank = this.planks.find((plank) => plank.qualifiedId === plankId);

    if (plank) {
      return await getPlankPresence(plank.locator);
    }

    return undefined;
  }

  /**
   * @deprecated Marking this as deprecated for now. We don't want to break plank references.
   */
  async closePlank(plank: string | Plank | undefined) {
    await this.updatePlanks();

    if (!plank) {
      return;
    }

    const plankId = typeof plank === 'string' ? plank : plank.qualifiedId;
    const foundPlank = this.planks.find((plank) => plank.qualifiedId === plankId);
    if (foundPlank) {
      await closePlank(foundPlank.locator);
    }

    await this.updatePlanks();
  }

  async closeAll() {
    await this.updatePlanks();
    for (const plank of [...this.planks]) {
      await this.closePlank(plank);
    }
  }
}
