//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import { describe, expect, it } from 'vitest';

import { Feed, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import * as AiSession from './AiSession';
import * as SessionLink from './SessionLink';

// Deterministic IDs so test assertions are stable across runs.
EntityId.dangerouslyDisableRandomness();

/**
 * Builds a Runtime<Feed.FeedService> backed by an in-memory feed→objects map.
 * The filter passed to Feed.query is intentionally ignored; type filtering is
 * handled downstream by Obj.instanceOf inside Session.getHistory and SessionLoader.
 */
const makeRuntime = (feedMap: Map<string, object[]>): Runtime.Runtime<Feed.FeedService> => {
  const layer = Layer.succeed(Feed.FeedService, {
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
  return Effect.runSync(Effect.runtime<Feed.FeedService>().pipe(Effect.provide(layer)));
};

describe('AiSession.Session.getHistory', () => {
  it('returns messages from the session feed', async () => {
    const feed = Feed.make();
    const msg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'hello' }] });

    const session = new AiSession.Session({ feed, runtime: makeRuntime(new Map([[feed.id, [msg]]])) });

    const result = await session.getHistory();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(msg.id);
  });

  it('prepends source history through a SessionLink (fork scenario)', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const msg1 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'original question' }] });
    const msg2 = Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'original answer' }] });
    const forkMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'follow-up from fork' }] });

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: msg2.id,
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [msg1, msg2]],
      [forkFeed.id, [link, forkMsg]],
    ]);
    const session = new AiSession.Session({ feed: forkFeed, runtime: makeRuntime(feedMap) });

    const result = await session.getHistory();

    // Source messages up to the cutoff are prepended; the fork message follows.
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(msg1.id);
    expect(result[1].id).toBe(msg2.id);
    expect(result[2].id).toBe(forkMsg.id);
  });

  it('respects the fork cutoff — excludes source messages after messageId', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const msg1 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'a' }] });
    const msg2 = Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: 'b' }] });
    const msg3 = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'c — beyond fork point' }] });

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: msg2.id, // fork at msg2; msg3 must be excluded
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [msg1, msg2, msg3]],
      [forkFeed.id, [link]],
    ]);
    const session = new AiSession.Session({ feed: forkFeed, runtime: makeRuntime(feedMap) });

    const result = await session.getHistory();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(msg1.id);
    expect(result[1].id).toBe(msg2.id);
  });

  it('returns only fork-feed messages when SessionLink messageId is not found (fail-closed)', async () => {
    const sourceFeed = Feed.make();
    const forkFeed = Feed.make();

    const sourceMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'source' }] });
    const forkMsg = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'fork only' }] });

    const link = Obj.make(SessionLink.SessionLink, {
      feedRef: Ref.make(sourceFeed),
      messageId: Obj.ID.random(), // does not exist in sourceFeed
    });

    const feedMap = new Map<string, object[]>([
      [sourceFeed.id, [sourceMsg]],
      [forkFeed.id, [link, forkMsg]],
    ]);
    const session = new AiSession.Session({ feed: forkFeed, runtime: makeRuntime(feedMap) });

    const result = await session.getHistory();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(forkMsg.id);
  });
});
