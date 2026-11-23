//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';

import { FeedHandle } from './feed/feed-handle.ts';
import { EchoTestBuilder } from './testing/index.ts';

const FEEDS = 4;
const ITEMS_PER_FEED = 50;
const OBJECTS = 20;

describe('ref load feed search', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  // Regression: every disk ref load of a document object also read every known feed whole, and then
  // every feed in the space, though the database answered it (UI lag trace, 2026-10-26).
  test('a document object found on disk reads no feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person, TestSchema.Expando] });
    const db = await peer.createDatabase();
    for (let feedIndex = 0; feedIndex < FEEDS; feedIndex++) {
      const feed = db.add(Feed.make({ name: `feed-${feedIndex}` }));
      await db.appendToFeed(
        feed,
        Array.from({ length: ITEMS_PER_FEED }, (_, index) => Obj.make(TestSchema.Person, { name: `p${index}` })),
      );
    }
    const ids = Array.from({ length: OBJECTS }, (_, index) => db.add(Obj.make(TestSchema.Expando, { index })).id);
    await db.flush({ indexes: true });

    await peer.reload();
    const reloaded = await peer.openLastDatabase();
    // Hold a handle on every feed, as a chat view does for its feeds.
    for (const feed of await reloaded.query(Query.select(Filter.type(Feed.Feed))).run()) {
      const uri = Feed.getFeedUri(feed);
      invariant(uri);
      reloaded._getOrCreateFeedHandle(uri, feed.namespace);
    }

    const fetches = vi.spyOn(FeedHandle.prototype, 'fetchObjectsJSON');
    const resolver = peer.client.graph.createRefResolver({ context: { space: reloaded.spaceId } });
    for (const id of ids) {
      const object = await resolver.resolve(EID.make({ entityId: id }), { source: 'disk' }).wait();
      expect(object?.id).toEqual(id);
    }
    expect(fetches).not.toHaveBeenCalled();
  });

  test('a feed item still resolves on disk', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));
    const person = Obj.make(TestSchema.Person, { name: 'john' });
    await db.appendToFeed(feed, [person]);
    await db.flush({ indexes: true });

    await peer.reload();
    const reloaded = await peer.openLastDatabase();
    const [loadedFeed] = await reloaded.query(Query.select(Filter.type(Feed.Feed))).run();
    const uri = Feed.getFeedUri(loadedFeed);
    invariant(uri);
    reloaded._getOrCreateFeedHandle(uri, loadedFeed.namespace);

    const resolved = await peer.client.graph
      .createRefResolver({ context: { space: reloaded.spaceId } })
      .resolve(EID.make({ entityId: person.id }), { source: 'disk' })
      .wait();
    expect(resolved?.id).toEqual(person.id);
  });
});
