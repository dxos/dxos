//
// Copyright 2024 DXOS.org
//

import type { Locator, Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the thread plugin.
export const Thread = {
  createComment: async (page: Page, plankLocator: Locator, comment: string) => {
    await plankLocator.getByTestId('editor.toolbar.comment').click();
    const input = Thread.getCurrentThread(page).getByRole('textbox');
    await input.fill(comment);
    await input.press('Enter');
  },

  getComments: (page: Page) => page.getByTestId('cm-comment'),

  getComment: (page: Page, text: string) =>
    page.getByTestId('cm-comment').filter({ has: page.locator(`span:has-text("${text}")`) }),

  getThreads: (page: Page) => page.getByTestId('thread'),

  getThread: (page: Page, text: string) =>
    page.getByTestId('thread').filter({ has: page.locator(`[data-testid="thread.heading"]:has-text("${text}")`) }),

  getCurrentThread: (page: Page) => page.locator('[data-testid=thread][aria-current="location"]'),

  deleteThread: (thread: Locator) => thread.getByTestId('thread.delete').click(),

  getMessages: (thread: Locator) => thread.getByTestId('thread.message'),

  getMessage: (thread: Locator, current: string) =>
    thread.getByTestId('thread.message').filter({
      has: thread.page().locator(`div:has-text("${current}")`),
    }),

  addMessage: async (thread: Locator, message: string) => {
    const input = thread.getByRole('textbox').last();
    await input.fill(message);
    await input.press('Enter');
  },

  deleteMessage: (message: Locator) => message.getByTestId('thread.message.delete').click(),
};
