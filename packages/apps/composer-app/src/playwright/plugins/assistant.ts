//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Page object for the assistant chat surface (`plugin-assistant`).
 *
 * All locators are scoped to a plank so a spec never reaches across the deck.
 */
export class Assistant {
  /**
   * The plank hosting a chat. Creating a chat swaps it in over the space home plank, which renders a
   * prompt of its own — so the thread, which only the chat surface has, is what tells them apart.
   */
  static plank(page: Page): Locator {
    return page.getByTestId('deck.plank').filter({ has: page.getByTestId('assistant.thread') });
  }

  readonly #locator: Locator;

  constructor(locator: Locator) {
    this.#locator = locator;
  }

  /**
   * The prompt's CodeMirror surface. `assistant.prompt` marks the composer's root group; the
   * editable text is the editor content inside it.
   */
  get prompt(): Locator {
    return this.#locator.getByTestId('assistant.prompt').locator('.cm-content');
  }

  /**
   * The message thread's root. The thread is a virtualized list of read-only CodeMirror documents,
   * one per message, so this matches the container and {@link text} reads across the messages.
   */
  get thread(): Locator {
    return this.#locator.getByTestId('assistant.thread');
  }

  /**
   * The failure toast the chat raises when a request fails (e.g. the AI service is unreachable).
   * Rendered in a portal at the document root, so it is located from the page rather than the plank.
   */
  get error(): Locator {
    return this.#locator.page().getByTestId('assistant.error');
  }

  /**
   * The thread's text, one message per line. Joined across the message editors because a
   * single-element read would violate strict mode as soon as a reply joins the prompt.
   */
  async text(): Promise<string> {
    return (await this.thread.locator('.cm-content').allInnerTexts()).join('\n');
  }

  /**
   * Types a prompt and submits it. `fill` can resolve before CodeMirror's state holds the text, and
   * submission reads that state — so the text is confirmed in the editor before Enter is sent.
   */
  async send(text: string): Promise<void> {
    await this.prompt.click();
    await this.prompt.fill(text);
    await expect(this.prompt).toHaveText(text);
    await this.prompt.press('Enter');
  }
}
