//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Chat from '@dxos/assistant/Chat';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Message, Thread } from '@dxos/types';

import { threadMessagesToFeed } from './capabilities/migrations.ts';

const message = (text: string, created: string) =>
  Obj.make(Message.Message, { created, sender: { role: 'user', name: 'Alice' }, blocks: [{ _tag: 'text', text }] });

describe('comment thread feed', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a thread saves its feed with it and reads messages in send order', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Thread.Thread, Message.Message, Feed.Feed] });
    const thread = db.add(Thread.make({ status: 'active' }));
    const feed = await thread.feed.load();
    expect(Obj.getParent(feed)).toBe(thread);

    await db.appendToFeed(feed, [message('second', '2026-01-02T00:00:00Z'), message('first', '2026-01-01T00:00:00Z')]);
    const messages = await Thread.loadMessages(thread);
    expect(messages.map(({ blocks }) => (blocks[0]._tag === 'text' ? blocks[0].text : ''))).toEqual([
      'first',
      'second',
    ]);
  });

  test('a removed message re-appended under its id returns to its place', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Thread.Thread, Message.Message, Feed.Feed] });
    const thread = db.add(Thread.make({ status: 'active' }));
    const feed = await thread.feed.load();
    const [first, middle, last] = [
      message('one', '2026-01-01T00:00:00Z'),
      message('two', '2026-01-02T00:00:00Z'),
      message('three', '2026-01-03T00:00:00Z'),
    ];
    await db.appendToFeed(feed, [first, middle, last]);

    await db.removeFeedItemsByIds(feed, [middle.id]);
    expect((await Thread.loadMessages(thread)).map(({ id }) => id)).toEqual([first.id, last.id]);

    const { id, ...fields } = middle;
    await db.appendToFeed(feed, [Obj.make(Message.Message, { id, ...fields })]);
    expect((await Thread.loadMessages(thread)).map(({ id }) => id)).toEqual([first.id, middle.id, last.id]);
  });

  test('a chat running on a thread feed leaves the feed with the thread', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Thread.Thread, Message.Message, Feed.Feed, Chat.Chat] });
    const thread = db.add(Thread.make({ status: 'active' }));
    const feed = await thread.feed.load();
    const chat = db.add(Chat.make({ feed: Ref.make(feed) }));
    expect(Obj.getParent(feed)).toBe(thread);
    expect(chat.feed.target).toBe(feed);
  });

  test('migrating a 0.2.0 thread moves its messages into a feed it owns', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase({ types: [Message.Message, Feed.Feed] });
    graph.registry.add([Thread.LegacyThread, Thread.Thread]);
    const [first, second] = [message('one', '2026-01-01T00:00:00Z'), message('two', '2026-01-02T00:00:00Z')];
    db.add(
      Obj.make(Thread.LegacyThread, {
        name: 'Legacy',
        status: 'active',
        messages: [Ref.make(db.add(second)), Ref.make(db.add(first))],
      }),
    );
    await db.flush();
    await db.runMigrations([threadMessagesToFeed]);

    const [thread] = await db.query(Filter.type(Thread.Thread)).run();
    expect(thread.name).toBe('Legacy');
    expect(Obj.getParent(await thread.feed.load())).toBe(thread);
    expect((await Thread.loadMessages(thread)).map(({ id }) => id)).toEqual([first.id, second.id]);
  });
});
