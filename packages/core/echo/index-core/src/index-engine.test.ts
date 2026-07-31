//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Context } from '@dxos/context';
import { ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { type DataSourceCursor, type IndexDataSource, IndexEngine, type IndexingResult } from './index-engine';
import { type IndexCursor, IndexTracker } from './index-tracker';
import { EntityMetaIndex, FtsIndex, type IndexerObject, ReverseRefIndex } from './indexes';

const TYPE_DEFAULT = DXN.make('com.example.type.Type', '0.1.0');
const TYPE_A = DXN.make('com.example.type.TypeA', '0.1.0');
const TYPE_B = DXN.make('com.example.type.TypeB', '0.1.0');

const TestLayer = SqlTransaction.layer.pipe(
  Layer.provideMerge(
    SqliteClient.layer({
      filename: ':memory:',
    }),
  ),
  Layer.provideMerge(Reactivity.layer),
);

class MockIndexDataSource implements IndexDataSource {
  readonly sourceName = 'mock-source';

  // Composite Key -> { object, hash, timestamp }
  // Key: `${spaceId}:${documentId}`
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
    _ctx: Context,
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.sync(() => {
      const results: { object: IndexerObject; hash: string }[] = [];

      for (const [, entry] of this._state.entries()) {
        const { object, hash } = entry;

        // Find cursor for this object.
        // Multi-space indexing: match by resourceId (documentId) only.
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

      // Apply limit if needed (simplistic logic).
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

describe('IndexEngine', () => {
  const setup = Effect.gen(function* () {
    const tracker = new IndexTracker();
    yield* tracker.migrate();
    const metaIndex = new EntityMetaIndex();
    yield* metaIndex.migrate();
    const ftsIndex = new FtsIndex();
    yield* ftsIndex.migrate();
    const reverseRefIndex = new ReverseRefIndex();
    yield* reverseRefIndex.migrate();
    const indexEngine = new IndexEngine({ tracker, ftsIndex, objectMetaIndex: metaIndex, reverseRefIndex });
    return { indexEngine, tracker, metaIndex, ftsIndex, reverseRefIndex };
  });

  it.effect(
    'should index and update objects',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;

      // Inject dependencies.
      const engine = new IndexEngine({ tracker, ftsIndex, objectMetaIndex: metaIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      const obj1: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_DEFAULT,
          title: 'Hello',
        },
      };

      dataSource.push([obj1]);

      // First update.
      const { updated } = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      // Updates objectMeta, FTS, and reverseRef indexes.
      expect(updated).toBe(2);

      // Verify using the SAME index instance.
      const results1 = yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT });
      expect(results1).toHaveLength(1);
      expect(results1[0].objectId).toBe(obj1.data.id);
      expect(results1[0].version).toBeGreaterThan(0);

      // Verify FTS index gets updated.
      const ftsResults1 = yield* ftsIndex.query({
        query: 'Hello',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
      expect(ftsResults1.length).toBeGreaterThan(0);
      expect(ftsResults1.some((row) => row.objectId === obj1.data.id)).toBe(true);

      // Update object.
      const obj1Updated: IndexerObject = {
        spaceId,
        documentId: obj1.documentId,
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: obj1.data.id, [ATTR_TYPE]: obj1.data[ATTR_TYPE], title: 'Hello World' },
      };
      dataSource.push([obj1Updated]);

      // Second update.
      const { updated: updated2 } = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(updated2).toBe(2);

      // Verify update.
      const results2 = yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT });
      expect(results2).toHaveLength(1);
      expect(results2[0].objectId).toBe(obj1Updated.data.id);
      expect(results2[0].version).toBeGreaterThan(results1[0].version);

      const ftsResults2 = yield* ftsIndex.query({
        query: 'World',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
      expect(ftsResults2.length).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle multiple objects',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;

      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex, ftsIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'd1',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_A,
            val: 1,
          },
        },
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'd2',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_A,
            val: 2,
          },
        },
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'd3',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: {
            id: EntityId.random(),
            [ATTR_TYPE]: TYPE_B,
            val: 3,
          },
        },
      ];

      dataSource.push(objects);

      yield* engine.update(Context.default(), dataSource, { spaceId: null });

      const resultsA = yield* metaIndex.query({ spaceId, typeDXN: TYPE_A });
      expect(resultsA).toHaveLength(2);

      const resultsB = yield* metaIndex.query({ spaceId, typeDXN: TYPE_B });
      expect(resultsB).toHaveLength(1);

      const ftsResults = yield* ftsIndex.query({
        query: 'TypeA',
        spaceId: null,
        includeAllQueues: false,
        queueIds: null,
      });
      expect(ftsResults).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'done is true only when all sub-indexes have no remaining work',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;

      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex, ftsIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      // First update with no data — both sub-indexes report done immediately.
      const { updated: updated0, done: done0 } = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(updated0).toBe(0);
      expect(done0).toBe(true);

      // Push an object so sub-indexes have work to do.
      dataSource.push([
        {
          spaceId,
          queueId: null,
          queueNamespace: null,
          documentId: 'doc-done-test',
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title: 'Done test' },
        },
      ]);

      // Update with pending data — sub-indexes process objects, done is false.
      const { updated: updated1, done: done1 } = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(updated1).toBeGreaterThan(0);
      expect(done1).toBe(false);

      // Second update with no new data — all sub-indexes caught up, done is true.
      const { updated: updated2, done: done2 } = yield* engine.update(Context.default(), dataSource, {
        spaceId: null,
      });
      expect(updated2).toBe(0);
      expect(done2).toBe(true);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'IndexingResult contains correct sets for a batch with multiple objects across spaces',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;
      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex, ftsIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId1 = SpaceId.random();
      const spaceId2 = SpaceId.random();
      const id1 = EntityId.random();
      const id2 = EntityId.random();

      const obj1: IndexerObject = {
        spaceId: spaceId1,
        documentId: 'doc-result-1',
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: id1, [ATTR_TYPE]: TYPE_A, title: 'Doc in space1' },
      };
      const obj2: IndexerObject = {
        spaceId: spaceId2,
        documentId: 'doc-result-2',
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: id2, [ATTR_TYPE]: TYPE_B, title: 'Doc in space2' },
      };

      dataSource.push([obj1, obj2]);

      const result: IndexingResult = yield* engine.update(Context.default(), dataSource, { spaceId: null });

      expect(result.updated).toBeGreaterThan(0);
      expect(result.done).toBe(false);

      // Spaces: both spaceIds should be present.
      expect(result.spaces.has(spaceId1)).toBe(true);
      expect(result.spaces.has(spaceId2)).toBe(true);

      // Documents: both doc IDs should be present.
      expect(result.documents.has('doc-result-1')).toBe(true);
      expect(result.documents.has('doc-result-2')).toBe(true);

      // Types: both TYPE_A and TYPE_B.
      expect(result.types.has(TYPE_A)).toBe(true);
      expect(result.types.has(TYPE_B)).toBe(true);

      // Object ids.
      expect(result.objects.has(id1)).toBe(true);
      expect(result.objects.has(id2)).toBe(true);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'IndexingResult includes typename for deleted objects',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;
      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex, ftsIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      const deletedObj: IndexerObject = {
        spaceId,
        documentId: 'doc-deleted',
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: {
          'id': EntityId.random(),
          [ATTR_TYPE]: TYPE_DEFAULT,
          '@deleted': true,
        },
      };

      dataSource.push([deletedObj]);

      const result: IndexingResult = yield* engine.update(Context.default(), dataSource, { spaceId: null });

      expect(result.updated).toBeGreaterThan(0);
      // Deleted objects should still contribute their typename to the hint.
      expect(result.types.has(TYPE_DEFAULT)).toBe(true);
      expect(result.spaces.has(spaceId)).toBe(true);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'IndexingResult is empty when no objects are indexed',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex, ftsIndex, reverseRefIndex } = yield* setup;
      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex, ftsIndex, reverseRefIndex });
      const dataSource = new MockIndexDataSource();

      const result: IndexingResult = yield* engine.update(Context.default(), dataSource, { spaceId: null });

      expect(result.updated).toBe(0);
      expect(result.done).toBe(true);
      expect(result.spaces.size).toBe(0);
      expect(result.queues.size).toBe(0);
      expect(result.documents.size).toBe(0);
      expect(result.types.size).toBe(0);
      expect(result.objects.size).toBe(0);
    }, Effect.provide(TestLayer)),
  );
});
