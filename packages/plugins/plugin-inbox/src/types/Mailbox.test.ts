//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { StateMap, TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder';
import * as Mailbox from './Mailbox';

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

describe('Mailbox message viewed state', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('markThreadViewed marks the whole conversation viewed, leaving other threads new', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, StateMap.StateMap, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const state = StateMap.bind<Mailbox.MessageState>(mailbox.messageState.target!);

    const thread = new Builder().createMessages(3, { threadId: 'thread-1' }).build().messages;
    const other = new Builder().createMessages(1, { threadId: 'thread-2' }).build().messages;

    // Every message starts new.
    expect(thread.every((message) => state.get(message.id).viewedAt === undefined)).toBe(true);

    // Opening the conversation marks its whole thread viewed; sibling threads stay new.
    Mailbox.markThreadViewed(mailbox, thread);
    expect(thread.every((message) => typeof state.get(message.id).viewedAt === 'string')).toBe(true);
    expect(state.get(other[0].id).viewedAt).toBeUndefined();

    // Idempotent: re-marking keeps the original timestamps.
    const stamps = thread.map((message) => state.get(message.id).viewedAt);
    Mailbox.markThreadViewed(mailbox, thread);
    expect(thread.map((message) => state.get(message.id).viewedAt)).toEqual(stamps);
  });

  test('newMessageCountAtom counts unread conversations (thread-level) and reacts to markThreadViewed', async ({
    expect,
  }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, StateMap.StateMap, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed.target!;

    // Two conversations: a 2-message thread and a 1-message thread — 3 messages, 2 threads.
    const threadA = new Builder().createMessages(2, { threadId: 'thread-a' }).build().messages;
    const threadB = new Builder().createMessages(1, { threadId: 'thread-b' }).build().messages;
    await EffectEx.runAndForwardErrors(
      Feed.append(feed, [...threadA, ...threadB]).pipe(Effect.provide(Database.layer(db))),
    );
    await db.flush();

    const registry = Registry.make();
    const atom = Mailbox.newMessageCountAtom(mailbox);
    const waitForCount = (target: number) =>
      new Promise<void>((resolve) => {
        let unsubscribe: (() => void) | undefined;
        const check = () => {
          if (registry.get(atom) === target) {
            unsubscribe?.();
            resolve();
          }
        };
        unsubscribe = registry.subscribe(atom, check);
        // Evaluate the current value now that the atom is active (subscribe does not fire synchronously).
        check();
      });

    // Two unread conversations (the 2-message thread counts once).
    await waitForCount(2);

    // Opening the 2-message conversation drops the count to one unread conversation.
    Mailbox.markThreadViewed(mailbox, threadA);
    await waitForCount(1);
  });

  test('the per-message viewed slice reacts to markThreadViewed', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, StateMap.StateMap, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const messageState = mailbox.messageState.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;

    // The tile derives its unread emphasis from this reactive slice (viewedAt === undefined ⇒ new).
    const registry = Registry.make();
    const atom = StateMap.atom<Mailbox.MessageState>(messageState, message.id);
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(registry.get(atom).viewedAt).toBeUndefined();
    expect(fireCount).toBe(1);

    // Opening the conversation flips the slice, which re-renders the tile as viewed.
    Mailbox.markThreadViewed(mailbox, [message]);
    await db.flush();
    expect(registry.get(atom).viewedAt).toBeDefined();
    expect(fireCount).toBe(2);
  });
});
