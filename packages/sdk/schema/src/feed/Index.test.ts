//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { invariant } from '@dxos/invariant';

import * as Index from './Index';

/**
 * A minimal immutable feed item standing in for e.g. an inbox Message.
 */
const Message = Schema.Struct({
  text: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.test.feed.Message', '0.1.0')));

/**
 * A host object pairing a feed of immutable items with a tag index over them.
 */
const Inbox = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
  tags: Index.field({ extra: { label: Schema.optional(Schema.String) } }),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.feed.Inbox', '0.1.0')));

describe('Index', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('tags messages stored in a feed', async () => {
    const { db, queues } = await builder.createDatabase({ types: [Feed.Feed, Message, Inbox] });

    // Host owns an immutable feed of messages.
    const feed = Feed.make();
    const inbox = db.add(Obj.make(Inbox, { feed: Ref.make(feed) }));
    Obj.setParent(feed, inbox);
    await db.flush();

    // Append generated messages to the feed queue.
    const queueDxn = Feed.getQueueUri(feed);
    invariant(queueDxn, 'feed should have a queue uri');
    const queue = queues.get(queueDxn);
    const hello = Obj.make(Message, { text: 'hello' });
    const world = Obj.make(Message, { text: 'world' });
    await queue.append([hello, world]);

    // Tag the messages.
    const tags = Index.bind(inbox, 'tags');
    tags.add('urgent', hello.id, { label: 'Urgent' });
    tags.add('urgent', world.id);
    tags.add('later', world.id, { label: 'Later' });

    // Membership: group -> ids.
    expect([...tags.members('urgent')]).toEqual([hello.id, world.id]);
    expect([...tags.members('later')]).toEqual([world.id]);
    expect([...tags.members('missing')]).toEqual([]);

    // Inverse lookup: id -> groups.
    expect(tags.groupsOf(world.id).sort()).toEqual(['later', 'urgent']);
    expect(tags.groupsOf(hello.id)).toEqual(['urgent']);

    // Per-group metadata.
    expect(tags.meta('urgent')).toEqual({ label: 'Urgent' });
    expect(tags.groups().sort()).toEqual(['later', 'urgent']);

    // The messages really live in the feed.
    const items = await Effect.runPromise(
      Feed.runQuery(feed, Filter.type(Message)).pipe(Effect.provide(createFeedServiceLayer(queues))),
    );
    expect(items.map((item) => item.text).sort()).toEqual(['hello', 'world']);
  });
});
