//
// Copyright 2024 DXOS.org
//

import { type Page, type Locator } from '@playwright/test';

export const getPlankArticles = async (page: Page): Promise<Locator[]> => page.getByTestId('deckPlugin.plank').all();

// TODO(Zan): Extend this with other plank types.
type PlankKind = 'markdown' | 'collection' | 'unknown';

// TODO(Zan): This might be better as a class, since we can track if it's been closed?
type Plank = { kind: PlankKind; locator: Locator; close: () => Promise<void>; open: () => Promise<void> };

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

type GetPlanksOptions = { filter?: PlankKind };

export const getPlanks = async (page: Page, options: GetPlanksOptions): Promise<Plank[]> => {
  const articles = await getPlankArticles(page);
  const results: Plank[] = [];

  for (const articleLocator of articles) {
    results.push({
      kind: await classifyArticleElement(articleLocator),
      locator: articleLocator,
      close: () => articleLocator.getByTestId('plankHeading.close').click(),
      open: () => articleLocator.getByTestId('plankHeading.open').click(),
    });
  }

  return options?.filter ? results.filter((plank) => plank.kind === options.filter) : results;
};
