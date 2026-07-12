//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Mailbox } from '@dxos/plugin-inbox';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { exportFeedMessages, replaceFeed } from './archive';

describe('feed archive', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const seedFeed = async (db: Database.Database, mailbox: Mailbox.Mailbox) => {
    const feed = mailbox.feed!.target!;
    const messages = [
      Message.make({
        created: '2026-07-01T09:00:00.000Z',
        sender: { email: 'a@example.com', name: 'A' },
        blocks: [{ _tag: 'text', text: 'first' }],
        properties: { subject: 'First' },
      }),
      Message.make({
        created: '2026-07-02T09:00:00.000Z',
        sender: { email: 'b@example.com', name: 'B' },
        blocks: [{ _tag: 'text', text: 'second' }],
        properties: { subject: 'Second' },
      }),
    ];
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));
    return feed;
  };

  test('export then import round-trips messages into a fresh feed', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const original = await seedFeed(db, mailbox);

    // Export serializes both messages.
    const serialized = await exportFeedMessages(original, db);
    expect(serialized).toHaveLength(2);
    expect(serialized.map((message: any) => message.properties?.subject).sort()).toEqual(['First', 'Second']);

    // Import replaces the feed and seeds it from the file.
    const count = await replaceFeed(mailbox, serialized, db);
    expect(count).toBe(2);

    // The mailbox now points at a different feed.
    const next = await mailbox.feed!.tryLoad();
    expect(next).toBeDefined();
    expect(next!.id).not.toBe(original.id);

    // The new feed contains the imported messages with fresh ids.
    const imported = await EffectEx.runPromise(
      Feed.query(next!, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
    );
    expect(imported.map((message) => Message.extractText(message)).sort()).toEqual(['first', 'second']);

    // Ids are freshly minted, not carried over from the exported file.
    const originalIds = new Set(serialized.map((entry: any) => entry.id));
    expect(imported.every((message) => !originalIds.has(message.id))).toBe(true);
  });

  test('reset attaches a fresh empty feed and deletes the previous one', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const original = await seedFeed(db, mailbox);

    // Reset is `replaceFeed` with no messages.
    const count = await replaceFeed(mailbox, [], db);
    expect(count).toBe(0);

    const next = await mailbox.feed!.tryLoad();
    expect(next!.id).not.toBe(original.id);
    const remaining = await EffectEx.runPromise(
      Feed.query(next!, Filter.type(Message.Message)).run.pipe(Effect.provide(Database.layer(db))),
    );
    expect(remaining).toHaveLength(0);
  });
});
