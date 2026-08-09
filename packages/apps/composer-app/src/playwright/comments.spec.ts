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
    // Space + document + comment + an edit round-trip runs 45-52s of the default 60s budget on a
    // loaded machine (CI measures 18s), so the tail of the flow was being cut off mid-call and
    // reported as "page closed" at whatever it was doing. Headroom, not a retry: the race that
    // silently dropped the typed text is fixed in `Message.tsx`.
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

    // Edit mode autofocuses the message editor; wait for that rather than clicking into it, since a
    // click inside the thread is the "reveal in the document" gesture and moves focus to that plank.
    // The keys stay page-level: clearing the text makes `message`'s hasText filter stop matching, so
    // a locator-scoped press would wait out the test on its own edit.
    await expect(messageTextbox).toBeFocused();
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
  //   check. Instrument THAT before the next attempt. UPDATE: instrumented and DISPROVED — during
  //   the stall handleAttend bails immediately (state.current already set) and the attention
  //   snapshot is byte-identical across the storm. The real mechanism is an async operation/query
  //   race: the earlier AddMessage completion resolves conspicuously late, a ~10-15x re-render
  //   burst follows with no logged trigger, and the thread ANCHOR transiently drops out of
  //   CommentsArticle's filteredAnchors — whose try/catch silently drops an anchor whenever
  //   Relation.getSource throws mid-mutation — sometimes unmounting the whole thread while the
  //   delete button is mid-click. DeleteMessage itself was instrumented and is correct. The fix
  //   belongs in the operations/query layer (late invocation completion + query re-fire), not in
  //   any component. A consumer-side anchor-resolution cache (fall back to the last resolved
  //   thread when getSource throws) was implemented and measured 2/5 — the detach loop persists
  //   even when anchors cannot drop, and one run saw the message list resolve to 0 elements — so
  //   the component-level avenue is exhausted; do not retry it.
  // RESOLVED(wittjosiah): The operations-layer race, timed. Each nested `Operation.invoke` spawns a
  // full process (~0.5-1.5s of pure ProcessManager/Effect-fiber scheduling per hop, no worker RPC
  // involved), so the first message's persist (`AddObject` then `AddRelation`, sequential) took over
  // 2s end to end. A reply typed during that window read the *same* still-listed draft entry — the
  // first call only clears it after its own persist finishes — so the second `AddMessage` also saw
  // `draft` truthy and re-ran the persist branch: a second `AddObject`/`AddRelation` pair for the same
  // anchor, which then lost the `claimed` race and rolled itself back via `db.remove(relation)` +
  // `db.remove(thread)` — deleting the very thread the first call (and the user's own messages)
  // depended on. That is the "no echo fingerprint" render storm and the transient/zero-element anchor
  // drop: real relation churn from a duplicate persist-then-rollback, not a query dedup gap. Fixed in
  // `add-message.ts` by gating the persist branch on whether `thread` already has a database
  // association (set by the first call's `AddObject`), not on the draft entry alone. 5/5 on webkit
  // `--repeat-each=5`.
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

  // Re-enabled with the attention gate made sticky (see `CommentsArticle`'s `currentId`): clicking
  // a comment attends the EDITOR plank, so the comments companion's gate briefly closed and dropped
  // the selection it had just recorded — permanently, since nothing re-fires. Two test-side bugs
  // were fixed alongside: lorem slices collided under strict-mode locators (unique anchor tokens
  // now), and `onSelect` routed through an async operation whose completions could reorder.
  test('selecting comment highlights thread and vice versa', async () => {
    await host.createSpace();
    await host.createObject({ type: 'Document' });

    const plank = host.deck.plank();
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(plank.locator);

    // Unique tokens rather than lorem slices: faker repeats words across paragraphs, so a slice
    // can match two cm-comment decorations and fail the strict-mode locators below (measured
    // locally: 'Consequatur pra' resolved to 2 elements). One paragraph per anchor — cm-comment
    // decorations are per-line and cannot match text spanning newlines.
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
