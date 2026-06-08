//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import * as TagIndex from './TagIndex';

/** A minimal immutable feed item. */
const Item = Schema.Struct({
  text: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.test.tagindex.Item', '0.1.0')));

/** A host pairing an immutable feed of items with a tag index over them. */
const Host = Schema.Struct({
  feed: Ref.Ref(Feed.Feed),
  tags: TagIndex.field(),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.tagindex.Host', '0.1.0')));

describe('TagIndex (feed integration)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('tags immutable feed objects and filters the feed by tag', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, Item, Host] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const host = yield* Database.add(Obj.make(Host, { feed: Ref.make(feed) }));
      Obj.setParent(feed, host);
      yield* Database.flush();

      // Append immutable items to the feed.
      const hello = Obj.make(Item, { text: 'hello' });
      const world = Obj.make(Item, { text: 'world' });
      yield* Feed.append(feed, [hello, world]);

      // Tag feed objects by their ids (tag ids reference existing Tag objects/URIs).
      const urgent = 'dxn:echo:@:urgent';
      const tags = TagIndex.bind(host, 'tags');
      tags.setTag(urgent, hello.id);

      // Persisted across a round-trip read (arrays stored as arrays, not numeric-keyed objects).
      expect([...tags.objects(urgent)]).toEqual([hello.id]);
      expect(tags.tags(hello.id)).toEqual([urgent]);

      // Filter the feed by tag.
      const items = yield* Feed.runQuery(feed, Filter.type(Item));
      const tagged = new Set(tags.objects(urgent));
      expect(items.filter((item) => tagged.has(item.id)).map((item) => item.text)).toEqual(['hello']);

      // Unset removes the association and prunes the empty tag.
      tags.unsetTag(urgent, hello.id);
      expect([...tags.objects(urgent)]).toEqual([]);
      expect(tags.tagIds()).toEqual([]);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });
});
