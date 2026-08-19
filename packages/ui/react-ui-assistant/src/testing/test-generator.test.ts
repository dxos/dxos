//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Database, Entity, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Message } from '@dxos/types';

import { createMessageGenerator } from './test-generator';

/**
 * In-memory Database.Service that records appendToFeed calls and emits a change event
 * whenever `appendToFeed` is called. Used to verify the streaming-message generator
 * emits per-chunk updates.
 */
const makeRecordingDatabaseLayer = () => {
  const items: Message.Message[] = [];
  const subscribers = new Set<() => void>();

  const dbService: Database.Database = {
    get spaceId() {
      return 'recording' as any;
    },
    add: (obj: any) => obj as any,
    addType: async () => undefined as any,
    remove: () => {},
    appendToFeed: async (_feed: Feed.Feed, newItems: Entity.Unknown[]) => {
      items.push(...(newItems as Message.Message[]));
      for (const fn of subscribers) {
        fn();
      }
    },
    removeFeedItemsByIds: async () => {},
    queryFeed: () => ({ subscribe: () => () => {}, results: [], run: async () => [] }) as any,
    query: () => ({ subscribe: () => () => {}, results: [], run: async () => [] }) as any,
    syncFeed: async () => {},
    getFeedSyncState: async () => ({ blocksToPull: 0, blocksToPush: 0, totalBlocks: 0 }),
    flush: async () => {},
    makeRef: () => undefined as any,
    deleteFromFeed: async () => {},
  } as unknown as Database.Database;

  return {
    items,
    onAppend: (cb: () => void) => subscribers.add(cb),
    layer: Layer.succeed(Database.Service, { db: dbService }),
  };
};

describe('createMessageGenerator', () => {
  test('streaming message publishes updates for chunk mutations', async ({ expect }) => {
    const recording = makeRecordingDatabaseLayer();
    let updates = 0;
    recording.onAppend(() => updates++);

    const feed = Obj.make(Feed.Feed, { name: 'recording' });

    // The streaming step is the third entry (index 2) — earlier indices are the initial
    // user prompt and an assistant message with an Organization link (which requires
    // a real database; the recording layer stub is sufficient for this streaming test).
    await EffectEx.runAndForwardErrors(
      createMessageGenerator()[2]!.pipe(
        Effect.provide(Layer.mergeAll(Feed.ContextFeedService.layer(feed), recording.layer)),
      ),
    );

    expect(recording.items).toHaveLength(1);
    expect(updates).toBeGreaterThan(1);
    expect(recording.items[0].blocks[0]).toMatchObject({ pending: false });
  });
});
