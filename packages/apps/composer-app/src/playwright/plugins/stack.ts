//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

import { StackManager } from '@dxos/react-ui-stack/playwright';

export const StackPlugin = {
  meta: {
    id: 'dxos.org/plugin/stack',
  },
};

// TODO(wittjosiah): If others find this useful, factor out the stack plugin.
export const Stack = {
  getStack: (page: Page) => new StackManager(page.getByTestId('main.stack')),

  addSection: async (page: Page, type: string) => {
    // TODO(wittjosiah): This currently helps reduce flakiness with waiting for the button to appear.
    await page.waitForTimeout(100);
    const dialogTrigger = await page.$('[data-testid="stack.addSection"]');
    await dialogTrigger!.click();
    await page.getByRole('listbox').getByText(type).first().click();

    const objectForm = page.getByTestId('create-object-form');
    if (await objectForm.isVisible()) {
      await objectForm.getByTestId('save-button').click();
    }
  },
};
