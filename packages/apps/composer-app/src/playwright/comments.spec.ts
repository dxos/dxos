//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { random } from '@dxos/random';

import { AppManager } from './app-manager';
import { Markdown, Thread } from './plugins';

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

    // NOTE(Zan): The input is autofocused, so we need to clear the text content and
    // type the new text instead of using `fill`.
    await host.page.keyboard.press('ControlOrMeta+A');
    await host.page.keyboard.press('Backspace');
    await host.page.keyboard.type(editedText);

    const saveEditButton = host.page.getByTestId('thread.message.save');
    await saveEditButton.click();

    const editedMessage = Thread.getMessage(thread, editedText).getByRole('textbox');
    await expect(editedMessage).toContainText(editedText);
  });

  // TODO(wittjosiah): Fails on the *add* path, not the delete path, so the anchor-resolution fix in
  //   `CommentOperation.Delete` does not touch it: 3 failures in 10 both before and after, always at
  //   the `toHaveCount(3)` after `addMessage` (got 2). Same signature as the webkit failure in run
  //   31147977323. The second message's ref does not always resolve into the rendered thread — a race
  //   in `add-message` rather than in deletion. Its two neighbours are now 10/10 and stay enabled.
  // TODO(wittjosiah): Two layers. The first is fixed: `addMessage` reached the reply composer as the
  //   *last* `role=textbox` (nothing identified it in the DOM), and when the ordering guess lost, the
  //   reply was typed into an existing message body — count stayed 2 where 3 was expected. It now
  //   targets `thread.reply`, and all three repeats get past that step. The remaining failure is at
  //   the delete click itself: `thread.message.delete` resolves, then loops "element is not stable" /
  //   "detached from the DOM" until timeout — the message row is being re-rendered continuously.
  //   Likely the same family as `undo delete thread`'s cm-comment count flapping in run 31215927769.
  //   Three mechanisms found by instrumentation; two are fixed, one remains. Fixed: echo property
  //   atoms over-firing (snapshotEquals, including ref-aware element comparison — Ref mints a
  //   fresh wrapper per read), and the add-path remount — CommentsArticle keyed threads by URI,
  //   which CHANGES when a draft thread persists, so the whole subtree remounted mid-typing and
  //   Enter fired on a fresh empty composer (add-path failures 0/5 with the stable key). Open:
  //   the delete-click stall. Measured during it: zero propertyFamily fires, zero message-tile
  //   renders, yet CommentThread + the reply composer re-render ~12 cycles until timeout — no
  //   echo fingerprint, so suspect the focus/attention path (Thread.Content onFocusCapture →
  //   handleAttend → shared stateAtom) or hover-transition styling racing Playwright's stability
  //   check. Instrument THAT before the next attempt.
  test.fixme('delete message', async () => {
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

  // TODO(wittjosiah): Not a flake, and not the decoration race the other three shared. The comments
  //   article computes `currentId = isAttended ? state.current : undefined`
  //   (CommentsArticle.tsx:229), so a thread is only marked current while the comments plank itself
  //   has attention. Clicking a *comment* attends the editor plank, so no thread gets
  //   `aria-current='location'` — while clicking a thread attends the comments plank, which is why
  //   the other direction passes. Whether the marker should survive attention moving to the editor
  //   is a product call about attention gating, so this stays deferred rather than being papered
  //   over in the test.
  test.fixme('selecting comment highlights thread and vice versa', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    const editorText = random.lorem.paragraphs(3);
    // Split into paragraphs so each slice stays within a single line;
    // cm-comment decorations are per-line and cannot match text spanning newlines.
    const [firstParagraph, secondParagraph, thirdParagraph] = editorText.split('\n');
    const firstMessage = firstParagraph.slice(0, 10);
    const secondMessage = secondParagraph.slice(0, 15);
    const thirdMessage = thirdParagraph.slice(-20);
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, firstMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await Markdown.select(editorTextbox, secondMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await Markdown.select(editorTextbox, thirdMessage);
    await Thread.createComment(host.page, plank.locator, random.lorem.sentence());
    await expect(Thread.getComment(host.page, thirdMessage)).toHaveAttribute('data-current', '1');
    await expect(Thread.getThread(host.page, thirdMessage)).toHaveAttribute('aria-current', 'location');

    // Selecting a comment should highlight the thread.
    await Thread.getComment(host.page, firstMessage).click();
    await expect(Thread.getComment(host.page, firstMessage)).toHaveAttribute('data-current', '1');
    await expect(Thread.getThread(host.page, firstMessage)).toHaveAttribute('aria-current', 'location');

    // Selecting a thread should highlight the comment.
    await Thread.getThread(host.page, secondMessage).click();
    await expect(Thread.getComment(host.page, secondMessage)).toHaveAttribute('data-current', '1');
    await expect(Thread.getThread(host.page, secondMessage)).toHaveAttribute('aria-current', 'location');
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
