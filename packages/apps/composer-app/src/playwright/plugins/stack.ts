//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

import { StackManager } from '@dxos/react-ui-stack/playwright';

export const StackPlugin = {
  meta: {
    profile: {
      key: 'org.dxos.plugin.stack',
    },
  },
};

// TODO(wittjosiah): If others find this useful, factor out the stack plugin.
export const Stack = {
  getStack: (page: Page) => new StackManager(page.getByTestId('main.stack')),

  addSection: async (page: Page, type: string) => {
    const addSectionLocator = page.getByTestId('stack.addSection');
    await addSectionLocator.waitFor({ state: 'visible', timeout: 5_000 });
    await addSectionLocator.click();

    // Wait for the type-search input in the create-object dialog.
    const searchInput = page.getByTestId('create-object-form.schema-input');
    await searchInput.waitFor({ state: 'visible' });
    // Ensure focus on the input (autoFocus may be unreliable in headless Firefox).
    await searchInput.click();
    await page.keyboard.type(type);

    // Wait for the filtered option to appear (search has a debounce).
    const listbox = page.getByRole('listbox');
    await listbox.getByRole('option').filter({ hasText: type }).first().waitFor({ state: 'visible' });

    // Picker.Input only fires triggerSelect() on Enter when selectedValue is set —
    // ArrowDown moves focus to the first item, then Enter commits it. Clicking the
    // option causes a false "target page closed" error in Firefox when the dialog
    // unmounts synchronously during Playwright's post-click verification phase.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const objectForm = page.getByTestId('create-object-form');
    if (await objectForm.isVisible()) {
      await objectForm.getByTestId('save-button').click();
    }
  },
};
