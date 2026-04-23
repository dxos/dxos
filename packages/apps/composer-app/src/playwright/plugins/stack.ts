//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

import { StackManager } from '@dxos/react-ui-stack/playwright';

export const StackPlugin = {
  meta: {
    id: 'org.dxos.plugin.stack',
  },
};

// TODO(wittjosiah): If others find this useful, factor out the stack plugin.
export const Stack = {
  getStack: (page: Page) => new StackManager(page.getByTestId('main.stack')),

  addSection: async (page: Page, type: string) => {
    const addSectionLocator = page.getByTestId('stack.addSection');
    await addSectionLocator.waitFor({ state: 'visible', timeout: 5_000 });
    await addSectionLocator.click();
    await page.getByRole('listbox').getByText(type).first().click();

    const objectForm = page.getByTestId('create-object-form');
    if (await objectForm.isVisible()) {
      await objectForm.getByTestId('save-button').click();
    }
  },
};
