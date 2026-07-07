//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder';
import * as Mailbox from './Mailbox';
import * as ThreadIndex from './ThreadIndex';

describe('Mailbox tags', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('applyTag creates a Tag object and indexes the immutable message', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    // Applying a tag creates a Tag object and indexes the message under its uri.
    const tagUri = await Mailbox.applyTag(mailbox, { label: 'Urgent' }, message, db);
    const tagObjects = await db.query(Filter.type(Tag.Tag)).run();
    expect(tagObjects.map((tag) => tag.label)).toContain('Urgent');
    expect(Mailbox.getTagsForMessage(mailbox, message)).toEqual([tagUri]);
    expect([...TagIndex.bind(mailbox.tags!.target!).objects(tagUri)]).toEqual([message.id]);

    // Idempotent: applying the same label (case-insensitive) reuses the Tag object.
    const tagUriAgain = await Mailbox.applyTag(mailbox, { label: 'urgent' }, message, db);
    expect(tagUriAgain).toEqual(tagUri);
    const urgentTags = (await db.query(Filter.type(Tag.Tag)).run()).filter(
      (tag) => tag.label.toLowerCase() === 'urgent',
    );
    expect(urgentTags).toHaveLength(1);

    // Removing unsets the association.
    Mailbox.removeTag(mailbox, tagUri, message);
    expect(Mailbox.getTagsForMessage(mailbox, message)).toEqual([]);
  });
});

describe('Mailbox threads', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('provisions the thread index lazily and accumulates conversation membership', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex, ThreadIndex.ThreadIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    // Two messages share one thread; a third is on its own.
    const { messages } = new Builder().createMessages(2, { threadId: 'thread-a' }).createMessage({}).build();
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));

    // The index does not exist until first requested.
    expect(mailbox.threads?.target).toBeUndefined();
    const index = ThreadIndex.bind(Mailbox.getOrCreateThreadIndex(mailbox, db));
    expect(mailbox.threads?.target).toBeDefined();
    // Idempotent: a second call returns the same object rather than provisioning another.
    expect(Mailbox.getOrCreateThreadIndex(mailbox, db)).toBe(mailbox.threads!.target);

    const [first, second] = messages.filter((message) => message.threadId === 'thread-a');
    index.add('thread-a', first);
    index.add('thread-a', second);
    // Idempotent by message id: re-adding the same message is a no-op.
    index.add('thread-a', first);

    expect(index.threadIds()).toEqual(['thread-a']);
    expect(index.messages('thread-a')).toHaveLength(2);
    // The per-thread count atom reflects the index (a fresh registry reads the current snapshot).
    const threadCount = (threadId: string) => Mailbox.threadCountAtom(Data.tuple(mailbox, threadId));
    expect(Registry.make().get(threadCount('thread-a'))).toBe(2);

    // Removing prunes the entry when the thread empties.
    index.remove('thread-a', first.id);
    index.remove('thread-a', second.id);
    expect(index.threadIds()).toEqual([]);
    expect(Registry.make().get(threadCount('thread-a'))).toBe(0);
  });

  test('addBatch commits a page in one transaction, including new threads created mid-batch', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex, ThreadIndex.ThreadIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    // A page mixing two messages on one thread, one on a second thread, and one unthreaded.
    const { messages } = new Builder()
      .createMessages(2, { threadId: 'thread-a' })
      .createMessage({ threadId: 'thread-b' })
      .createMessage({})
      .build();
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));

    const index = ThreadIndex.bind(Mailbox.getOrCreateThreadIndex(mailbox, db));
    const [threadAFirst, threadASecond] = messages.filter((message) => message.threadId === 'thread-a');
    const threadBMessage = messages.find((message) => message.threadId === 'thread-b')!;

    index.addBatch([
      { threadId: 'thread-a', message: threadAFirst },
      { threadId: 'thread-b', message: threadBMessage },
      // thread-a's second entry appears after thread-b in the batch — the existing-thread-id set
      // must reflect thread-a from the first entry, not just the pre-batch snapshot.
      { threadId: 'thread-a', message: threadASecond },
    ]);

    expect(index.threadIds().sort()).toEqual(['thread-a', 'thread-b']);
    expect(index.messages('thread-a')).toHaveLength(2);
    expect(index.messages('thread-b')).toHaveLength(1);

    // Idempotent per entry: re-submitting the same batch does not duplicate membership.
    index.addBatch([
      { threadId: 'thread-a', message: threadAFirst },
      { threadId: 'thread-a', message: threadASecond },
      { threadId: 'thread-b', message: threadBMessage },
    ]);
    expect(index.messages('thread-a')).toHaveLength(2);
    expect(index.messages('thread-b')).toHaveLength(1);

    // An empty batch is a no-op (no `Obj.update` should fire; nothing to assert beyond no throw/no change).
    index.addBatch([]);
    expect(index.threadIds().sort()).toEqual(['thread-a', 'thread-b']);
  });
});
