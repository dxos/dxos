//
// Copyright 2023 DXOS.org
//

import type { Locator, Page } from '@playwright/test';

export class KanbanManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }
}
