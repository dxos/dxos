//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

import { StackManager } from '@dxos/react-ui-stack/testing';

// TODO(wittjosiah): If others find this useful, factor out the stack plugin.
export const Stack = {
  getStack: (page: Page) => new StackManager(page.getByTestId('main.stack')),

  createSection: async (page: Page, plugin: string) => {
    const dialogTrigger = await page.$('[data-testid="stack.createSection"]');
    if (dialogTrigger) {
      await dialogTrigger.click();
    }
    return page.getByTestId(`${plugin}.createSection`).click();
  },
};
