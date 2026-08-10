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
    // Wait for the newly-created draft thread to appear with aria-current="location". After the
    // click, there is a brief window where React has not yet re-rendered the new draft thread into
    // the DOM, so the locator resolves to nothing.
    try {
      await currentThread.waitFor({ state: 'visible' });
    } catch (err) {
      // No current thread means the marker landed on nothing or on a DIFFERENT thread, which a bare
      // locator timeout cannot separate; report every thread's marker state instead.
      throw new Error(`no thread is current after creating a comment; threads: ${await Thread.describeThreads(page)}`, {
        cause: err,
      });
    }
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

  /**
   * Every rendered thread as `<id>:<aria-current>`, for attributing a missing or misplaced current
   * marker. DOM-only, so it adds no cost to a passing run.
   */
  describeThreads: async (page: Page): Promise<string> => {
    const threads = await page
      .getByTestId('thread')
      .evaluateAll((elements) =>
        elements.map((element) => `${element.id || '(no id)'}:${element.getAttribute('aria-current') ?? 'null'}`),
      )
      .catch(() => [] as string[]);
    return threads.length > 0 ? threads.join(', ') : '(none rendered)';
  },

  /**
   * Every rendered comment mark as `<threadId>:<data-current>`, the editor-side counterpart to
   * {@link describeThreads}.
   */
  describeComments: async (page: Page): Promise<string> => {
    const marks = await page
      .getByTestId('cm-comment')
      .evaluateAll((elements) =>
        elements.map(
          (element) =>
            `${(element.getAttribute('data-comment-id') ?? '?').split('/').pop()}:${element.getAttribute('data-current') ?? 'null'}`,
        ),
      )
      .catch(() => [] as string[]);
    return marks.length > 0 ? [...new Set(marks)].join(', ') : '(none rendered)';
  },

  /**
   * Asserts the marker is on the thread AND the comment naming `text`, reporting the whole marker
   * state on failure since a bare `toHaveAttribute` cannot say whether it went missing or landed
   * elsewhere.
   */
  expectCurrent: async (page: Page, text: string): Promise<void> => {
    try {
      await expect(Thread.getComment(page, text)).toHaveAttribute('data-current', '1');
      await expect(Thread.getThread(page, text)).toHaveAttribute('aria-current', 'location');
    } catch (err) {
      throw new Error(
        `marker not on "${text}" — threads: ${await Thread.describeThreads(page)}; comments: ${await Thread.describeComments(page)}`,
        { cause: err },
      );
    }
  },

  deleteThread: (thread: Locator) => thread.getByTestId('thread.delete').click(),

  getMessages: (thread: Locator) => thread.getByTestId('thread.message'),

  getMessage: (thread: Locator, current: string) => thread.getByTestId('thread.message').filter({ hasText: current }),

  /**
   * The thread's reply composer, scoped by `thread.reply` rather than the last `role=textbox`: message
   * bodies are CodeMirror editors too, so ordering could pick the wrong one to type into.
   */
  getReplyInput: (thread: Locator) => thread.getByTestId('thread.reply').getByRole('textbox'),

  addMessage: async (thread: Locator, message: string) => {
    const input = Thread.getReplyInput(thread);
    await input.fill(message);
    await input.press('Enter');
  },

  deleteMessage: (message: Locator) => message.getByTestId('thread.message.delete').click(),
};
