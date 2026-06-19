//
// Copyright 2024 DXOS.org
//

import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the thread plugin.
export const Thread = {
  createComment: async (page: Page, plankLocator: Locator, comment: string) => {
    const addButton = plankLocator.getByTestId('comments.comment.add');
    // The selectionAspect is updated via a 100ms debounce after the CodeMirror selection dispatch,
    // which controls the disabled state. Explicitly wait for enabled before clicking.
    await expect(addButton).toBeEnabled();
    await addButton.click();
    const currentThread = Thread.getCurrentThread(page);
    // Wait for the newly-created draft thread to appear with aria-current="location".
    // After the click, there is a brief window where React has not yet re-rendered
    // the new draft thread into the DOM, so the locator resolves to nothing.
    await currentThread.waitFor({ state: 'visible' });
    // Use .last() because message body editors also render as textboxes (via CodeMirror),
    // and the reply input is always the last textbox in the thread.
    const input = currentThread.getByRole('textbox').last();
    await input.fill(comment);
    await input.press('Enter');
  },

  getComments: (page: Page) => page.getByTestId('cm-comment'),

  getComment: (page: Page, text: string) => page.getByTestId('cm-comment').filter({ hasText: text }),

  getThreads: (page: Page) => page.getByTestId('thread'),

  getThread: (page: Page, text: string) =>
    page.getByTestId('thread').filter({ has: page.getByTestId('thread.heading').filter({ hasText: text }) }),

  getCurrentThread: (page: Page) => page.locator('[data-testid=thread][aria-current="location"]'),

  deleteThread: async (thread: Locator) => {
    // Thread.Header uses hoverableControls — the delete button is opacity:0 until hovered.
    await thread.hover();
    await thread.getByTestId('thread.delete').click();
  },

  getMessages: (thread: Locator) => thread.getByTestId('thread.message'),

  getMessage: (thread: Locator, current: string) => thread.getByTestId('thread.message').filter({ hasText: current }),

  addMessage: async (thread: Locator, message: string) => {
    const input = thread.getByRole('textbox').last();
    await input.fill(message);
    await input.press('Enter');
  },

  deleteMessage: (message: Locator) => message.getByTestId('thread.message.delete').click(),
};
