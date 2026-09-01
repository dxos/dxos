//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { random } from '@dxos/random';

import { AppManager } from './app-manager.ts';
import { Markdown, Thread } from './plugins/index.ts';

random.seed(0);

// NOTE: Reduce flakiness in CI by using waitForExpect.
test.describe('Comments tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    await editorTextbox.fill('Hello wold!');
    await Markdown.select(editorTextbox, 'wold');
    await Thread.createComment(host.page, plank.locator, 'world');
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);
  });

  test('edit message', async () => {
    test.slow();

    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = 'Hello world!';
    const messageText = 'Example';
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, editorText);
    await Thread.createComment(host.page, plank.locator, messageText);
    const thread = Thread.getThread(host.page, editorText);
    const message = Thread.getMessage(thread, messageText);
    const messageTextbox = message.getByRole('textbox');

    await expect(messageTextbox).toContainText(messageText);

    const editButton = host.page.getByTestId('thread.message.edit');
    await editButton.click();

    const editedText = 'Edited';

    // Edit mode autofocuses the message editor; wait for that rather than clicking, since a click
    // inside the thread is the "reveal in the document" gesture and moves focus elsewhere. Keys stay
    // page-level because clearing the text stops `message`'s hasText filter from matching.
    await expect(messageTextbox).toBeFocused();
    await host.page.keyboard.press('ControlOrMeta+A');
    await host.page.keyboard.press('Backspace');
    await host.page.keyboard.type(editedText);

    const saveEditButton = host.page.getByTestId('thread.message.save');
    await saveEditButton.click();

    const editedMessage = Thread.getMessage(thread, editedText).getByRole('textbox');
    await expect(editedMessage).toContainText(editedText);
  });

  test('delete message', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = random.lorem.paragraph();
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, editorText);
    const firstMessage = random.lorem.sentence();
    await Thread.createComment(host.page, plank.locator, firstMessage);
    const thread = Thread.getThread(host.page, editorText);
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);
    await expect(Thread.getMessages(thread)).toHaveCount(2);

    // Add a second message to the thread.
    const secondMessage = random.lorem.sentence();
    await Thread.addMessage(thread, secondMessage);
    await expect(Thread.getMessages(thread)).toHaveCount(3);

    // Delete the second message.
    await Thread.deleteMessage(Thread.getMessage(thread, secondMessage));
    await expect(Thread.getMessages(thread)).toHaveCount(2);

    // Deleting last message should delete the thread.
    await Thread.deleteMessage(Thread.getMessage(thread, firstMessage));
    await expect(Thread.getComments(host.page)).toHaveCount(0);
    await expect(Thread.getThreads(host.page)).toHaveCount(0);
  });

  test('delete thread', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = random.lorem.paragraph();
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, editorText);
    const firstMessage = random.lorem.sentence();
    await Thread.createComment(host.page, plank.locator, firstMessage);
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);

    const thread = Thread.getThread(host.page, editorText);
    await Thread.deleteThread(thread);
    await expect(Thread.getComments(host.page)).toHaveCount(0);
    await expect(Thread.getThreads(host.page)).toHaveCount(0);
  });

  test('undo delete thread', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = random.lorem.paragraph();
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, editorText);
    const firstMessage = random.lorem.sentence();
    await Thread.createComment(host.page, plank.locator, firstMessage);
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);

    const thread = Thread.getThread(host.page, editorText);
    await Thread.deleteThread(thread);
    await expect(Thread.getComments(host.page)).toHaveCount(0);
    await expect(Thread.getThreads(host.page)).toHaveCount(0);

    // Undo delete.
    await host.toastAction();
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);
  });

  test('selecting comment highlights thread and vice versa', async () => {
    test.slow();

    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    // Unique tokens rather than lorem slices: faker repeats words across paragraphs, so a slice can
    // match two cm-comment decorations and fail the strict-mode locators below. One anchor per line,
    // since cm-comment decorations cannot match text spanning newlines.
    const firstMessage = 'anchor-alpha';
    const secondMessage = 'anchor-bravo';
    const thirdMessage = 'anchor-charlie';
    const editorText = [firstMessage, secondMessage, thirdMessage]
      .map((anchor) => `${anchor} ${random.lorem.sentence()}`)
      .join('\n');
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, firstMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await Markdown.select(editorTextbox, secondMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await Markdown.select(editorTextbox, thirdMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await Thread.expectCurrent(host.page, thirdMessage);

    // Selecting a comment should highlight the thread.
    await Thread.getComment(host.page, firstMessage).click();
    await Thread.expectCurrent(host.page, firstMessage);

    // Selecting a thread should highlight the comment.
    await Thread.getThread(host.page, secondMessage).click();
    await Thread.expectCurrent(host.page, secondMessage);
  });

  // TODO(wittjosiah): Paste doesn't work in headless mode.
  test.skip('cut & paste comment', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = random.lorem.paragraphs(3);
    const messageText = editorText.slice(10, 20);
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, messageText);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await expect(Thread.getComment(host.page, messageText)).toHaveAttribute('data-current', '1');
    await expect(Thread.getThread(host.page, messageText)).toHaveAttribute('aria-current', 'location');

    await Markdown.getMarkdownTextbox(host.page).focus();
    const cut = editorText.slice(0, 50);
    await Markdown.select(editorTextbox, cut);
    await host.cut();
    await expect(Thread.getComments(host.page)).toHaveCount(0);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);

    await Markdown.getMarkdownTextbox(host.page).focus();
    await host.paste();
    await expect(Thread.getComments(host.page)).toHaveCount(1);
    await expect(Thread.getThreads(host.page)).toHaveCount(1);
  });
});
