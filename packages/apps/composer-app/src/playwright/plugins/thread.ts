//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the thread plugin.
export const Thread = {
  createComment: async (page: Page, plankLocator: Locator, comment: string) => {
    const addButton = plankLocator.getByTestId('comments.comment.add');
    // The button's disabled state is driven by aspect, which updates via a
    // debounce after a CodeMirror selection dispatch. Wait until it is enabled.
    await expect(addButton).toBeEnabled();
    await addButton.click();
    const currentThread = Thread.getCurrentThread(page);
    // Wait for the newly-created draft thread to appear with aria-current="location".
    // After the click, there is a brief window where React has not yet re-rendered
    // the new draft thread into the DOM, so the locator resolves to nothing.
    await currentThread.waitFor({ state: 'visible' });
    const input = Thread.getReplyInput(currentThread);
    await input.fill(comment);
    await input.press('Enter');
  },

  getComments: (page: Page) => page.getByTestId('cm-comment'),

  getComment: (page: Page, text: string) => page.getByTestId('cm-comment').filter({ hasText: text }),

  getThreads: (page: Page) => page.getByTestId('thread'),

  getThread: (page: Page, text: string) =>
    page.getByTestId('thread').filter({ has: page.getByTestId('thread.heading').filter({ hasText: text }) }),

  getCurrentThread: (page: Page) => page.locator('[data-testid=thread][aria-current="location"]'),

  deleteThread: (thread: Locator) => thread.getByTestId('thread.delete').click(),

  getMessages: (thread: Locator) => thread.getByTestId('thread.message'),

  getMessage: (thread: Locator, current: string) => thread.getByTestId('thread.message').filter({ hasText: current }),

  /**
   * The thread's reply composer. Scoped by `thread.reply` rather than picking the last
   * `role=textbox`: message bodies are CodeMirror editors too, so ordering decided which editor was
   * typed into, and getting it wrong edited an existing message instead of adding one.
   */
  getReplyInput: (thread: Locator) => thread.getByTestId('thread.reply').getByRole('textbox'),

  addMessage: async (thread: Locator, message: string) => {
    const input = Thread.getReplyInput(thread);
    await input.fill(message);
    await input.press('Enter');
  },

  deleteMessage: (message: Locator) => message.getByTestId('thread.message.delete').click(),
};
