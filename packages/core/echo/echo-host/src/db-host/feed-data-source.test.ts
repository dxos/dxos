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

import { FeedDataSource } from './feed-data-source.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' });

const setup = Effect.gen(function* () {
  const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
  const feedStore = new FeedStore({ localActorId: 'actor-id', assignPositions: false });
  yield* feedStore.migrate();
  const spaceId = SpaceId.random();
  const source = new FeedDataSource({ feedStore, runtime, getSpaceIds: () => [spaceId] });
  // A feed belongs to one namespace, as in production.
  const feedIds: Record<string, string> = { data: EntityId.random(), trace: EntityId.random() };
  const append = (feedNamespace: string, count = 1) =>
    feedStore.appendLocal(
      Array.from({ length: count }, () => ({
        spaceId,
        feedId: feedIds[feedNamespace],
        feedNamespace,
        data: EchoFeedCodec.encode({ id: EntityId.random() }),
      })),
    );
  return { source, append, spaceId };
});

/** Hides the blocks table, so any read of it fails the test rather than going unnoticed. */
const withoutBlocks = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks RENAME TO blocks_hidden`),
    () => effect,
    () => Effect.orDie(Effect.flatMap(SqlClient.SqlClient, (sql) => sql`ALTER TABLE blocks_hidden RENAME TO blocks`)),
  );

describe('FeedDataSource', () => {
  it.effect('reads data blocks, then answers caught-up cursors without reading blocks', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.data, 2);
      yield* append(FeedProtocol.WellKnownNamespaces.trace, 3);

      const first = yield* source.getChangedObjects(Context.default(), [], { limit: 50 });
      expect(first.objects.map((object) => object.queueNamespace)).toEqual(['data', 'data']);
      expect(first.cursors.map((cursor) => cursor.resourceId)).toEqual(['data']);

      const idle = yield* withoutBlocks(source.getChangedObjects(Context.default(), first.cursors, { limit: 50 }));
      expect(idle.objects).toEqual([]);
      expect(idle.cursors).toEqual(first.cursors);
      expect(idle.more).toBe(false);

      // A trace append is not the index's to read; a data append is seen on the next read.
      yield* append(FeedProtocol.WellKnownNamespaces.trace);
      yield* append(FeedProtocol.WellKnownNamespaces.data);
      const next = yield* source.getChangedObjects(Context.default(), idle.cursors, { limit: 50 });
      expect(next.objects.map((object) => object.queueNamespace)).toEqual(['data']);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('passes a cursor over an unindexed namespace through without reading it', () =>
    Effect.gen(function* () {
      const { source, append, spaceId } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.trace, 2);
      const legacy: DataSourceCursor = { spaceId, resourceId: FeedProtocol.WellKnownNamespaces.trace, cursor: '' };

      const result = yield* source.getChangedObjects(Context.default(), [legacy], { limit: 50 });
      expect(result.objects).toEqual([]);
      expect(result.cursors).toContainEqual(legacy);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('shares one read between the legs of a pass', () =>
    Effect.gen(function* () {
      const { source, append } = yield* setup;
      yield* append(FeedProtocol.WellKnownNamespaces.data, 2);

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
});
