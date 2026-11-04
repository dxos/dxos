//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { DXN } from '@dxos/keys';

import { FeedAnnotation, getFeedRef, getSeen, isFeedOwnerSchema, markSeen, trackSeen, unseenQuery } from './feed.ts';

/** Holds its feed under `feed`, like `Mailbox` and `Calendar`. */
class Mailbox extends Type.makeObject<Mailbox>(DXN.make('com.example.type.mailbox', '0.1.0'))(
  Schema.Struct({ feed: Ref.Ref(Feed.Feed) }).pipe(FeedAnnotation.set({ property: 'feed' })),
) {}

/** Holds its feed under a different name — the case a hardcoded `.feed` cannot serve. */
class Journal extends Type.makeObject<Journal>(DXN.make('com.example.type.journal', '0.1.0'))(
  Schema.Struct({ entries: Ref.Ref(Feed.Feed) }).pipe(FeedAnnotation.set({ property: 'entries' })),
) {}

class Contact extends Type.makeObject<Contact>(DXN.make('com.example.type.contact', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}

describe('FeedAnnotation', () => {
  test('isFeedOwnerSchema discriminates annotated types', ({ expect }) => {
    expect(isFeedOwnerSchema(Mailbox)).toBe(true);
    expect(isFeedOwnerSchema(Journal)).toBe(true);
    expect(isFeedOwnerSchema(Contact)).toBe(false);
  });

  test('getFeedRef resolves the annotated property, not a hardcoded `feed`', ({ expect }) => {
    const feed = Obj.make(Feed.Feed, {});
    expect(getFeedRef(Obj.make(Mailbox, { feed: Ref.make(feed) }))?.uri).toEqual(Ref.make(feed).uri);
    expect(getFeedRef(Obj.make(Journal, { entries: Ref.make(feed) }))?.uri).toEqual(Ref.make(feed).uri);
  });

  test('getFeedRef returns undefined for an unannotated type', ({ expect }) => {
    expect(getFeedRef(Obj.make(Contact, { name: 'Alice' }))).toBeUndefined();
  });
});

describe('SeenAnnotation', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('items after the seen cursor are unseen until a view marks the newest', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make());
    await db.appendToFeed(feed, [
      Obj.make(TestSchema.Person, { name: 'a' }),
      Obj.make(TestSchema.Person, { name: 'b' }),
    ]);
    await db.flush();
    const unseen = async () => db.query(unseenQuery(feed, getSeen(feed)!)).run();

    // Nobody has opened the feed, so nothing is tracked; opening it starts from the beginning.
    expect(getSeen(feed)).toBeUndefined();
    trackSeen(feed);
    expect((await unseen()).map((person) => (person as TestSchema.Person).name)).toEqual(['a', 'b']);

    markSeen(feed, (await unseen()).at(-1)!);
    expect(await unseen()).toHaveLength(0);

    await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'c' })]);
    await db.flush();
    expect((await unseen()).map((person) => (person as TestSchema.Person).name)).toEqual(['c']);

    // Tracking again keeps the cursor where the view left it.
    trackSeen(feed);
    expect(await unseen()).toHaveLength(1);
  });
});
