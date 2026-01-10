//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ObjectId, SpaceId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource } from './index-engine';
import { type IndexCursor } from './index-tracker';
import { Indexer } from './indexer';
import { type IndexerObject } from './indexes';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

/**
 * Mock data source for testing.
 */
class MockIndexDataSource implements IndexDataSource {
  readonly sourceName = 'mock-source';

  private _state = new Map<string, { object: IndexerObject; hash: string }>();

  push(objects: IndexerObject[]) {
    for (const obj of objects) {
      invariant(obj.documentId, 'documentId is required');
      this._state.set(`${obj.spaceId}:${obj.documentId}`, {
        object: obj,
        hash: Math.random().toString(36).substring(7),
      });
    }
  }

  getChangedObjects(
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.sync(() => {
      const results: { object: IndexerObject; hash: string }[] = [];

      for (const [, entry] of this._state.entries()) {
        const { object, hash } = entry;

        const cursor = cursors.find((c) => c.spaceId === object.spaceId && c.resourceId === object.documentId);

        let include = false;
        if (!cursor) {
          include = true;
        } else {
          include = cursor.cursor !== hash;
        }

        if (include) {
          results.push({ object, hash });
        }
      }

      const limitedResults = opts?.limit ? results.slice(0, opts.limit) : results;

      const objects = limitedResults.map((r) => r.object);
      const newCursors: DataSourceCursor[] = limitedResults.map((r) => ({
        spaceId: r.object.spaceId,
        resourceId: r.object.documentId,
        cursor: r.hash,
      }));

      return { objects, cursors: newCursors };
    });
  }
}

describe('Indexer', () => {
  it.effect(
    'should open, migrate, and close',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
      });

      yield* Effect.promise(() => indexer.open());
      expect(indexer.initialized).toBe(true);

      yield* Effect.promise(() => indexer.close());
      expect(indexer.initialized).toBe(false);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should index objects and query by type',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Person', name: 'John' },
      };

      dataSource.push([obj]);
      yield* Effect.promise(() => indexer.updateIndexes());

      const results = yield* Effect.promise(() =>
        indexer.execQuery({
          type: { spaceId: spaceId.toString(), typeDxn: 'test.Person' },
        }),
      );

      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe(obj.data.id);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query by full-text search',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Document', title: 'Hello World' },
      };

      dataSource.push([obj]);
      yield* Effect.promise(() => indexer.updateIndexes());

      const results = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'Hello' },
        }),
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snapshot).toContain('Hello');

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should emit updated event when objects are indexed',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      let updateCount = 0;
      indexer.updated.on(() => {
        updateCount++;
      });

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Item', value: 42 },
      };

      dataSource.push([obj]);
      yield* Effect.promise(() => indexer.updateIndexes());

      expect(updateCount).toBe(1);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should return empty results for unknown query type',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
      });

      yield* Effect.promise(() => indexer.open());

      // Empty query object.
      const results = yield* Effect.promise(() => indexer.execQuery({}));

      expect(results).toHaveLength(0);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should schedule and run indexing via DeferredTask',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Task', done: false },
      };

      dataSource.push([obj]);

      // Use scheduleUpdate instead of direct updateIndexes.
      indexer.scheduleUpdate();
      yield* Effect.promise(() => indexer.updateIndexes());

      const results = yield* Effect.promise(() =>
        indexer.execQuery({
          type: { spaceId: spaceId.toString(), typeDxn: 'test.Task' },
        }),
      );

      expect(results).toHaveLength(1);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );
});
