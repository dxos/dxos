//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Database, Feed, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { type Message } from '@dxos/types';

import { createMessageGenerator } from './test-generator';

/**
 * In-memory FeedService that records appends and emits a change event whenever
 * `append` is called. Used to verify the streaming-message generator emits
 * per-chunk updates.
 */
const makeRecordingFeedLayer = () => {
  const items: Message.Message[] = [];
  const subscribers = new Set<() => void>();

  const feedService: Context.Tag.Service<Feed.FeedService> = {
    append: async (_feed: Feed.Feed, newItems) => {
      items.push(...(newItems as Message.Message[]));
      for (const fn of subscribers) {
        fn();
      }
    },
    remove: async () => {},
    query: () =>
      ({
        subscribe: () => () => {},
        results: [],
        run: async () => [],
      }) as any,
    sync: async () => {},
    getSyncState: async () => ({ blocksToPull: 0, blocksToPush: 0, totalBlocks: 0 }),
  };

  return {
    items,
    onAppend: (cb: () => void) => subscribers.add(cb),
    layer: Layer.succeed(Feed.FeedService, feedService),
  };
};

describe('createMessageGenerator', () => {
  test('streaming message publishes updates for chunk mutations', async ({ expect }) => {
    const recording = makeRecordingFeedLayer();
    let updates = 0;
    recording.onAppend(() => updates++);

    const feed = Obj.make(Feed.Feed, { name: 'recording' });

    // The streaming step is the third entry (index 2) — earlier indices are the initial
    // user prompt and an assistant message with an Organization link (which requires
    // `Database.Service`, unavailable in this unit-test layer).
    await runAndForwardErrors(
      createMessageGenerator()[2]!.pipe(
        Effect.provide(Layer.mergeAll(Feed.ContextFeedService.layer(feed), recording.layer, Database.notAvailable)),
      ),
    );

    expect(recording.items).toHaveLength(1);
    expect(updates).toBeGreaterThan(1);
    expect(recording.items[0].blocks[0]).toMatchObject({ pending: false });
  });
});
