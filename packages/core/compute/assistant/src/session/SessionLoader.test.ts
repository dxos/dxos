//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, it } from 'vitest';

import { Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import * as SessionLink from './SessionLink';
import { SessionLoader } from './SessionLoader';

// Deterministic IDs so snapshots are stable across runs.
EntityId.dangerouslyDisableRandomness();

/**
 * Builds a Layer<Feed.FeedService> backed by an in-memory feed→objects map.
 * Each feed only contains the objects registered for it; unknown feeds return [].
 * SessionLoader already type-filters results via Obj.instanceOf, so returning all
 * objects is sufficient.
 */
const makeFeedLayer = (feedMap: Map<string, object[]>): Layer.Layer<Feed.FeedService> =>
  Layer.succeed(Feed.FeedService, {
    append: async () => {},
    remove: async () => {},
    query: (feed: Feed.Feed) => ({
      subscribe: () => () => {},
      results: [],
      run: async () => feedMap.get(feed.id) ?? [],
    }),
    sync: async () => {},
    getSyncState: async () => ({ blocksToPull: 0, blocksToPush: 0, totalBlocks: 0 }),
  } as any);

const run = <A>(effect: Effect.Effect<A, never, Feed.FeedService>, feedMap: Map<string, object[]>): Promise<A> =>
  EffectEx.runAndForwardErrors(effect.pipe(Effect.provide(makeFeedLayer(feedMap))));

describe('SessionLoader', () => {
  it('returns original messages when no SessionLink exists in feed', async () => {
    const feed = Feed.make();
    const loader = new SessionLoader();
    const msg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });

    const result = await run(loader.reifyHistory(feed, [msg]), new Map([[feed.id, []]]));

    expect(result).toEqual([msg]);
  });

  it('prepends source history when SessionLink resolves to a valid message', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const msg1 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'first' }] });
    const msg2 = Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'second' }] });
    const forkMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'new turn' }] });

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: msg2.id,
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [msg1, msg2]],
      [forkFeed.id, [link]],
    ]);
    const loader = new SessionLoader();

    const result = await run(loader.reifyHistory(forkFeed, [forkMsg]), feedMap);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(msg1.id);
    expect(result[1].id).toBe(msg2.id);
    expect(result[2].id).toBe(forkMsg.id);
  });

  it('respects the fork cutoff — excludes messages after messageId', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const msg1 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'a' }] });
    const msg2 = Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'b' }] });
    const msg3 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'c — after fork' }] });

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: msg2.id, // fork at msg2; msg3 should be excluded
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [msg1, msg2, msg3]],
      [forkFeed.id, [link]],
    ]);
    const loader = new SessionLoader();

    const result = await run(loader.reifyHistory(forkFeed, []), feedMap);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(msg1.id);
    expect(result[1].id).toBe(msg2.id);
  });

  it('returns original messages when messageId is not found in source feed (fail-closed)', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const msg1 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'existing' }] });
    const currentMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'new turn' }] });

    const missingId = Obj.ID.random();
    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: missingId,
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [msg1]],
      [forkFeed.id, [link]],
    ]);
    const loader = new SessionLoader();

    const result = await run(loader.reifyHistory(forkFeed, [currentMsg]), feedMap);

    expect(result).toEqual([currentMsg]);
  });

  it('returns original messages when source feed reference is unresolvable', async () => {
    const forkFeed = Feed.make();
    const unresolvedFeed = Feed.make(); // intentionally absent from feedMap

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(unresolvedFeed),
      messageId: Obj.ID.random(),
    });

    const feedMap = new Map<string, object[]>([[forkFeed.id, [link]]]);
    const loader = new SessionLoader();

    const currentMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });
    const result = await run(loader.reifyHistory(forkFeed, [currentMsg]), feedMap);

    expect(result).toEqual([currentMsg]);
  });
});
