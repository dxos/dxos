//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Query, Ref, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

// Headless coverage for the comment flows exercised by `composer-app/src/playwright/comments.spec.ts`.
// In Composer a comment is a `Thread` (holding `Message` refs) attached to a document via an
// `AnchoredTo` relation whose `anchor` encodes the selected text range. The Playwright tests drive
// the thread sidebar UI; here we exercise the same data mutations — mirroring the `CommentOperation`
// handlers (`Create` / `AddMessage` / `DeleteMessage` / `Delete` / `Restore`) — against a real ECHO
// space from the composer test harness, without the anchoring editor or sidebar DOM.

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin({})] });
  const client = harness.get(ClientCapabilities.Client);
  await client.addTypes([Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo]);
  const { personalSpace } = await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return { harness, db: personalSpace.db };
};

type Db = Awaited<ReturnType<typeof setup>>['db'];

const message = (text: string, role: 'user' | 'assistant' = 'user') =>
  Message.make({ sender: { role }, blocks: [{ _tag: 'text', text }] });

/** Create a document, a thread with its first message, and the anchor relation binding them. */
const createComment = (db: Db, docText: string, commentText: string) => {
  const subject = db.add(Text.make({ content: docText }));
  const first = db.add(message(commentText));
  const thread = db.add(Thread.make({ name: docText, status: 'active', messages: [Ref.make(first)] }));
  const anchor = db.add(AnchoredTo.make({ [Relation.Source]: thread, [Relation.Target]: subject, anchor: '0:5' }));
  return { subject, thread, anchor, first };
};

describe('comment flow', () => {
  test('create a comment thread anchored to a document', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { thread, anchor, subject } = createComment(db, 'Hello world!', 'world');

    const threads = await db.query(Query.type(Thread.Thread)).run();
    expect(threads.length).toBe(1);
    expect(thread.messages.length).toBe(1);
    // The anchor relation binds the thread (source) to the document (target).
    expect(Relation.getSource(anchor)).toBe(thread);
    expect(Relation.getTarget(anchor)).toBe(subject);
  });

  test('edit a comment message', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { first } = createComment(db, 'Hello world!', 'Example');
    expect(Message.extractText(first)).toBe('Example');

    // Playwright `edit message`: replace the message body text.
    Obj.update(first, (first) => {
      first.blocks = [{ _tag: 'text', text: 'Edited' }];
    });
    expect(Message.extractText(first)).toBe('Edited');
  });

  test('add then delete a message', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { thread } = createComment(db, 'lorem ipsum', 'first');
    expect(thread.messages.length).toBe(1);

    // Playwright `delete message`: add a second message, then delete it.
    const second = db.add(message('second'));
    Obj.update(thread, (thread) => {
      thread.messages.push(Ref.make(second));
    });
    expect(thread.messages.length).toBe(2);

    const index = thread.messages.findIndex((ref) => ref.target === second);
    Obj.update(thread, (thread) => {
      thread.messages.splice(index, 1);
    });
    db.remove(second);
    expect(thread.messages.length).toBe(1);
    expect(Obj.isDeleted(second)).toBe(true);
  });

  test('deleting the last message deletes the thread', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { thread, anchor, first } = createComment(db, 'lorem ipsum', 'only message');
    expect(thread.messages.length).toBe(1);

    // Playwright `delete message`: deleting the final message removes the whole thread + its anchor
    // (DeleteMessage delegates to Delete when the thread would be left empty).
    Obj.update(thread, (thread) => {
      thread.messages.splice(0, 1);
    });
    db.remove(first);
    db.remove(anchor);
    db.remove(thread);

    const threads = await db.query(Query.type(Thread.Thread)).run();
    expect(threads.length).toBe(0);
    expect(Obj.isDeleted(thread)).toBe(true);
  });

  test('undo restores a deleted thread', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const { thread, anchor } = createComment(db, 'lorem ipsum', 'to be deleted');

    // Playwright `delete thread`.
    db.remove(anchor);
    db.remove(thread);
    expect((await db.query(Query.type(Thread.Thread)).run()).length).toBe(0);

    // Playwright `undo delete thread`: Restore re-adds the thread and its anchor.
    db.add(thread);
    db.add(anchor);
    const threads = await db.query(Query.type(Thread.Thread)).run();
    expect(threads.length).toBe(1);
    expect(threads[0].messages.length).toBe(1);
  });
});
