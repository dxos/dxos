//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';

import { Context } from '@dxos/context';
import { EchoFeedCodec } from '@dxos/echo-protocol';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { FeedStore } from '@dxos/feed';
import { type DataSourceCursor } from '@dxos/index-core';
import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { BACKFILL_FINISHED, FeedDataSource, backfillResourceId } from './feed-data-source.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

const setup = Effect.gen(function* () {
  const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
  const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
  yield* feedStore.migrate();
  const spaceId = SpaceId.random();
  const source = new FeedDataSource({ feedStore, runtime, getSpaceIds: () => [spaceId] });
  // A feed belongs to one namespace, as in production.
  const feedIds: Record<string, string> = { data: EntityId.random(), trace: EntityId.random() };
  const append = (feedNamespace: string, count = 1, feedId = feedIds[feedNamespace]) =>
    feedStore.appendLocal(
      Array.from({ length: count }, () => ({
        spaceId,
        feedId,
        feedNamespace,
        data: EchoFeedCodec.encode({ id: EntityId.random() }),
      })),
    );
  return { source, append, spaceId, feedStore, feedIds };
});

/** Hides the blocks table, so any read of it fails the test rather than going unnoticed. */
const withoutBlocks = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks RENAME TO blocks_hidden`),
    () => effect,
    () => Effect.orDie(Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks_hidden RENAME TO blocks`)),
  );

describe('FeedDataSource', () => {
  it.effect('reads data and trace blocks, then answers caught-up cursors without reading blocks', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.data, 2);
      yield* append(FeedProtocol.WellKnownNamespaces.trace, 3);

      const first = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });
      expect(first.objects.map((object) => object.queueNamespace).sort()).toEqual([
        'data',
        'data',
        'trace',
        'trace',
        'trace',
      ]);

      const idle = yield* withoutBlocks(source.getChangedObjects(Context.default(), first.cursors, { limit: 50 }));
      expect(idle.objects).toEqual([]);
      expect(idle.cursors).toEqual(first.cursors);
      expect(idle.more).toBe(false);

      // Moving one namespace's head is seen on the next read; the other stays caught up.
      yield* append(FeedProtocol.WellKnownNamespaces.trace);
      const next = yield* source.getChangedObjects(Context.default(), idle.cursors, { limit: 50 });
      expect(next.objects.map((object) => object.queueNamespace)).toEqual(['trace']);
      const dataCursor = (cursors: DataSourceCursor[]) => cursors.find((cursor) => cursor.resourceId === 'data');
      expect(dataCursor(next.cursors)).toEqual(dataCursor(first.cursors));
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('reads every block from an empty cursor when position order differs from insertion order', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      const trace = FeedProtocol.WellKnownNamespaces.trace;
      yield* append(trace, 60);
      const sql = yield* SqlClient.SqlClient;
      yield* sql`UPDATE blocks SET position = CASE WHEN insertionId <= 10 THEN insertionId + 1000 ELSE insertionId END`;

      const seen = new Set<string>();
      let cursors: DataSourceCursor[] = [];
      for (let pass = 0; pass < 10; pass++) {
        const result = yield* source.getChangedObjects(Context.default(), cursors, { limit: 25 });
        for (const object of result.objects) {
          seen.add(object.data.id);
        }
        cursors = result.cursors;
        if (result.objects.length === 0) {
          break;
        }
      }
      expect(seen.size).toBe(60);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('shares one read between the legs of a pass', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.trace, 2);

      source.beginPass();
      const first = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });
      const second = yield* withoutBlocks(source.getChangedObjects(Context.default(), [], { limit: 50 }));
      source.endPass();

      expect(second.objects).toEqual(first.objects);
      expect(second.cursors).toEqual(first.cursors);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('reports no cursors to an activity-only read', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.data);

      const result = yield* withoutBlocks(
        source.getChangedObjects(Context.default(), [], { limit: 50, objects: false }),
      );
      expect(result).toEqual({ objects: [], cursors: [], more: false });
    }).pipe(Effect.provide(TestLayer)),
  );

  // A stored cursor the store did not issue failed the whole pass, and with it the host.
  it.effect('reads a feed again from the start when its cursor carries another token', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.data, 2);
      const first = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });

      const foreign = first.cursors.map((cursor) => ({
        ...cursor,
        cursor: String(cursor.cursor).replace(/^[^|]*/, 'foreign'),
      }));
      const next = yield* source.getChangedObjects(Context.default(), foreign, { limit: 50 });
      expect(next.objects.map((object) => object.queueNamespace)).toEqual(['data', 'data']);
      expect(next.cursors).toEqual(first.cursors);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('skips the blocks of a feed with indexing disabled and still advances past them', () =>
    Effect.gen(function* () {
      const { source, append, spaceId, feedStore, feedIds } = yield* setup;
      const data = FeedProtocol.WellKnownNamespaces.data;
      const otherFeed = EntityId.random();
      yield* feedStore.setFeedOptions({
        spaceId,
        feedId: feedIds.data,
        feedNamespace: data,
        options: { indexing: { enabled: false } },
      });
      yield* append(data, 2);
      yield* append(data, 1, otherFeed);

      source.beginPass();
      const first = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });
      source.endPass();
      expect(first.objects.map((object) => object.queueId)).toEqual([otherFeed]);
      expect(source.takeReport().skippedFeeds).toEqual(new Map([[spaceId, new Set([feedIds.data])]]));

      const next = yield* source.getChangedObjects(Context.default(), first.cursors, { limit: 50 });
      expect(next.objects).toEqual([]);
      expect(next.cursors).toEqual(first.cursors);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a backfill cursor reads its feed alone to the end, then finishes', () =>
    Effect.gen(function* () {
      const { source, append, spaceId, feedIds } = yield* setup;
      const data = FeedProtocol.WellKnownNamespaces.data;
      const otherFeed = EntityId.random();
      yield* append(data, 3);
      yield* append(data, 1, otherFeed);
      const caughtUp = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });
      yield* append(data, 1);

      const resourceId = backfillResourceId(data, feedIds.data);
      const backfill: DataSourceCursor = { spaceId, resourceId, cursor: '' };
      const first = yield* source.getChangedObjects(Context.default(), [...caughtUp.cursors, backfill], { limit: 50 });
      // The backfill reads all four blocks; the namespace cursor leaves the backfilled feed to it.
      expect(first.objects.map((object) => object.queueId)).toEqual(Array(4).fill(feedIds.data));

      const second = yield* source.getChangedObjects(Context.default(), first.cursors, { limit: 50 });
      expect(second.objects).toEqual([]);
      expect(second.cursors.find((cursor) => cursor.resourceId === resourceId)?.cursor).toBe(BACKFILL_FINISHED);
      expect(source.takeReport().finishedBackfills).toEqual(new Map([[spaceId, new Set([resourceId])]]));
    }).pipe(Effect.provide(TestLayer)),
  );
});
