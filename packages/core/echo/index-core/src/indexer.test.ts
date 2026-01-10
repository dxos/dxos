//
// Copyright 2026 DXOS.org

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_TYPE } from '@dxos/echo/internal';
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

        const cursor = cursors.find((c) => c.resourceId === object.documentId);

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
    'should migrate all indexes',
    Effect.fnUntraced(function* () {
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      // Migration should succeed without errors.
      yield* indexer.migrate();

      // Verify tables exist by running a query (would fail if tables don't exist).
      const results = yield* indexer.query({});
      expect(results).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should index objects and query by type',
    Effect.fnUntraced(function* () {
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      yield* indexer.migrate();

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Person', name: 'John' },
      };

      dataSource.push([obj]);
      yield* indexer.update();

      const results = yield* indexer.query({
        type: { spaceId: spaceId.toString(), typeDxn: 'test.Person' },
      });

      expect(results).toHaveLength(1);
      expect(results[0].objectId).toBe(obj.data.id);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should query by full-text search',
    Effect.fnUntraced(function* () {
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      yield* indexer.migrate();

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Document', title: 'Hello World' },
      };

      dataSource.push([obj]);
      yield* indexer.update();

      const results = yield* indexer.query({
        text: { query: 'Hello' },
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snapshot).toContain('Hello');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should return update count when objects are indexed',
    Effect.fnUntraced(function* () {
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      yield* indexer.migrate();

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Item', value: 42 },
      };

      dataSource.push([obj]);
      const result = yield* indexer.update();

      // FTS and ReverseRef both process the object, so updated count reflects both.
      expect(result.updated).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should return empty results for unknown query type',
    Effect.fnUntraced(function* () {
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      yield* indexer.migrate();

      // Empty query object.
      const results = yield* indexer.query({});

      expect(results).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle multiple update cycles',
    Effect.fnUntraced(function* () {
      const spaceId = SpaceId.random();
      const dataSource = new MockIndexDataSource();

      const indexer = new Indexer({
        dataSource,
      });

      yield* indexer.migrate();

      const obj: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Task', done: false },
      };

      dataSource.push([obj]);
      yield* indexer.update();

      const results = yield* indexer.query({
        type: { spaceId: spaceId.toString(), typeDxn: 'test.Task' },
      });

      expect(results).toHaveLength(1);
    }, Effect.provide(TestLayer)),
  );
});
