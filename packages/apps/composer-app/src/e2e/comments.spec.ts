//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { type Peer, createObject, createPeer, createSpace, selectEditorText, typeInEditor } from './composer';

const threadCount = z.object({
  count: z.number().describe('the number of comment threads shown in the comments panel'),
});

const countThreads = async (peer: Peer): Promise<number> =>
  (await peer.extract('How many comment threads are shown in the comments panel?', threadCount)).count;

/**
 * Create a comment on the current editor selection with the given first message.
 */
const createComment = async (host: Peer, message: string): Promise<void> => {
  await host.act('Click the add-comment button in the document editor toolbar');
  await host.act('Type %message% into the new comment thread message input', { variables: { message } });
  // The input keeps focus after the fill — submit with the real keyboard rather than a
  // second model-resolved action. Submitting converts the draft thread into a persisted
  // one, re-rendering the panel; give it time to settle before the next snapshot.
  await host.page.keyPress('Enter');
  await host.page.waitForTimeout(2_000);
};

describe('Comments tests', () => {
  let host: Peer;

  beforeEach(async () => {
    host = await createPeer();
    await createSpace(host);
    await createObject(host, 'Document');
  });

  afterEach(async () => {
    await host.close();
  });

  test('create', async () => {
    await typeInEditor(host, 'Hello wold!');
    await selectEditorText(host.page, 'wold');
    await createComment(host, 'world');

    expect(await countThreads(host)).toBe(1);
  });

  test('edit message', async () => {
    await typeInEditor(host, 'Hello world!');
    await selectEditorText(host.page, 'Hello world!');
    await createComment(host, 'Example');

    await host.act('Hover over the message that says "Example" in the comment thread');
    await host.act('Click the edit button belonging to the message that says "Example"');
    // The editing input autofocuses with the existing text; replace it via the keyboard.
    await host.page.keyPress(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await host.page.keyPress('Backspace');
    await host.page.type('Edited');
    await host.act('Click the save button on the comment message being edited');
    await host.page.waitForTimeout(500);

    const message = await host.extract(
      'What is the body text of the reply message inside the comment thread (not the quoted/anchored document text)?',
      z.object({ text: z.string() }),
    );
    expect(message.text).toContain('Edited');
  });

  test('delete message', async () => {
    await typeInEditor(host, 'The quick brown fox jumps over the lazy dog.');
    await selectEditorText(host.page, 'The quick brown fox jumps over the lazy dog.');
    await createComment(host, 'first message');

    // Add a second message to the thread.
    await host.act('Type "second message" into the reply input at the bottom of the comment thread');
    await host.page.keyPress('Enter');
    await host.page.waitForTimeout(1_000);
    const messageCount = z.object({ count: z.number().describe('the number of messages in the comment thread') });
    expect((await host.extract('How many messages does the comment thread contain?', messageCount)).count).toBe(2);

    // Delete the second message.
    await host.act('Hover over the message that says "second message" in the comment thread');
    await host.act('Click the delete (x) button belonging to the message that says "second message"');
    await host.page.waitForTimeout(1_000);
    expect((await host.extract('How many messages does the comment thread contain?', messageCount)).count).toBe(1);

    // Deleting the last message should delete the thread.
    await host.act('Hover over the message that says "first message" in the comment thread');
    await host.act('Click the delete (x) button belonging to the message that says "first message"');
    await host.page.waitForTimeout(1_000);
    expect(await countThreads(host)).toBe(0);
  });

  test('delete thread', async () => {
    await typeInEditor(host, 'Comment anchor text.');
    await selectEditorText(host.page, 'Comment anchor text.');
    await createComment(host, 'to be deleted');
    expect(await countThreads(host)).toBe(1);

    await host.act('Click the delete button on the comment thread header');
    await host.page.waitForTimeout(1_000);
    expect(await countThreads(host)).toBe(0);
  });

  test('undo delete thread', async () => {
    await typeInEditor(host, 'Comment anchor text.');
    await selectEditorText(host.page, 'Comment anchor text.');
    await createComment(host, 'to be restored');
    expect(await countThreads(host)).toBe(1);

    await host.act('Click the delete button on the comment thread header');
    // The toast auto-dismisses within seconds — undo immediately; deletion itself is
    // covered by the 'delete thread' test.
    await host.act('Click the undo action button in the toast notification');
    await host.page.waitForTimeout(1_000);
    expect(await countThreads(host)).toBe(1);
  });

  test('selecting comment highlights thread and vice versa', async () => {
    await typeInEditor(host, 'alpha anchor line\nbeta anchor line');
    // Anchor a comment on each line (decorations are per-line).
    await selectEditorText(host.page, 'alpha anchor line');
    await createComment(host, 'comment on alpha');
    await selectEditorText(host.page, 'beta anchor line');
    await createComment(host, 'comment on beta');

    // The active thread is communicated via aria-current, which is invisible in the
    // rendered text an extraction sees — read it from the DOM directly.
    const activeThreadAnchor = () =>
      host.page.evaluate(
        () =>
          [...document.querySelectorAll('[data-testid="thread"]')]
            .find((thread) => thread.getAttribute('aria-current') === 'location')
            ?.querySelector('[data-testid="thread.heading"]')?.textContent ?? null,
      );

    // Selecting the commented text in the editor should highlight its thread.
    await selectEditorText(host.page, 'alpha anchor line');
    await host.page.waitForTimeout(1_000);
    expect(await activeThreadAnchor()).toContain('alpha anchor line');

    // Selecting a thread should highlight its comment anchor in the editor.
    await host.act('Click the heading of the comment thread that quotes "beta anchor line" in the comments panel');
    await host.page.waitForTimeout(1_000);
    expect(await activeThreadAnchor()).toContain('beta anchor line');
  });

  // TODO(wittjosiah): Paste doesn't work in headless mode.
  test.skip('cut & paste comment', async () => {
    // Clipboard-dependent; blocked on headless clipboard support.
  });
});
