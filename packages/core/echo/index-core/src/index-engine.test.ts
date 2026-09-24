//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Context } from '@dxos/context';
import { ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
import { IndexEngine, type IndexingResult } from './index-engine.ts';
import { type IndexCursor } from './index-tracker.ts';
import { EntityMetaIndex, type IndexerObject } from './indexes/index.ts';
import { TestSqliteLayer as TestLayer } from './testing/index.ts';

const TYPE_DEFAULT = DXN.make('com.example.type.Type', '0.1.0');
const TYPE_A = DXN.make('com.example.type.TypeA', '0.1.0');
const TYPE_B = DXN.make('com.example.type.TypeB', '0.1.0');

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
    const engine = new IndexEngine(yield* SqlClient.SqlClient);
    yield* engine.migrate();
    // The stores are stateless accessors over the same `SqlClient` the engine writes through, so
    // one constructed here reads exactly what the engine wrote.
    return { engine, metaIndex: new EntityMetaIndex(yield* SqlClient.SqlClient) };
  });

  it.effect(
    'should index and update objects',
    Effect.fnUntraced(function* () {
      const { engine, metaIndex } = yield* setup;
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
      // Updates objectMeta, the snapshot store, and the reverseRef index.
      expect(updated).toBe(2);

      // Verify using the SAME index instance.
      const results1 = yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT });
      expect(results1).toHaveLength(1);
      expect(results1[0].objectId).toBe(obj1.data.id);
      expect(results1[0].version).toBeGreaterThan(0);

      // Verify FTS index gets updated.
      yield* engine.updateSecondaryIndexes(Context.default());
      const ftsResults1 = yield* engine.queryText({
        query: 'Hello',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
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

      yield* engine.updateSecondaryIndexes(Context.default());
      const ftsResults2 = yield* engine.queryText({
        query: 'World',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(ftsResults2.length).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle multiple objects',
    Effect.fnUntraced(function* () {
      const { engine, metaIndex } = yield* setup;
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
            title: 'Alpha one',
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
            title: 'Alpha two',
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
            title: 'Beta three',
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

      yield* engine.updateSecondaryIndexes(Context.default());
      // The index holds text, not the object's JSON, so the typename is not a search term.
      const ftsResults = yield* engine.queryText({
        query: 'Alpha',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(ftsResults).toHaveLength(2);
      const byTypename = yield* engine.queryText({
        query: 'TypeA',
        spaceId: null,
        includeAllQueues: false,
        queues: null,
      });
      expect(byTypename).toHaveLength(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'done is true only when all sub-indexes have no remaining work',
    Effect.fnUntraced(function* () {
      const { engine, metaIndex } = yield* setup;
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
      const { engine, metaIndex } = yield* setup;
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
      const { engine, metaIndex } = yield* setup;
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
      const { engine, metaIndex } = yield* setup;
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

  describe('secondary indexes', () => {
    const makeObject = (spaceId: SpaceId, documentId: string, title: string): IndexerObject => ({
      spaceId,
      documentId,
      queueId: null,
      queueNamespace: null,
      recordId: null,
      createdAt: null,
      updatedAt: Date.now(),
      data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title },
    });

    it.effect(
      'leaves the full-text index behind the snapshot store until a secondary pass runs',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const dataSource = new MockIndexDataSource();
        const spaceId = SpaceId.random();
        dataSource.push([makeObject(spaceId, 'doc-1', 'Deferred Tokenization')]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });

        const sql = yield* SqlClient.SqlClient;
        expect(yield* sql`SELECT rowid FROM ftsIndex`).toHaveLength(0);

        // The snapshot store is written on the primary pass, so everything read from it is current.
        const meta = yield* engine.queryType({ spaceId, typeDXN: TYPE_DEFAULT });
        expect(yield* engine.querySnapshotsJSON(meta.map((row) => row.recordId))).toHaveLength(1);

        const { updated } = yield* engine.updateSecondaryIndexes(Context.default());
        expect(updated).toBe(1);
        expect(yield* sql`SELECT rowid FROM ftsIndex`).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'resumes from its cursor, so a later pass indexes only what is new',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const dataSource = new MockIndexDataSource();
        const spaceId = SpaceId.random();
        dataSource.push([makeObject(spaceId, 'doc-1', 'First')]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });
        expect((yield* engine.updateSecondaryIndexes(Context.default())).updated).toBe(1);
        expect((yield* engine.updateSecondaryIndexes(Context.default())).done).toBe(true);

        dataSource.push([makeObject(spaceId, 'doc-2', 'Second')]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });
        expect((yield* engine.updateSecondaryIndexes(Context.default())).updated).toBe(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'coalesces repeated writes into a single re-tokenization',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const dataSource = new MockIndexDataSource();
        const spaceId = SpaceId.random();
        const object = makeObject(spaceId, 'doc-1', 'Alpha');
        for (const title of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
          object.data.title = title;
          dataSource.push([object]);
          yield* engine.update(Context.default(), dataSource, { spaceId: null });
        }

        expect((yield* engine.updateSecondaryIndexes(Context.default())).updated).toBe(1);

        const query = { spaceId: null, includeAllQueues: false, queues: null };
        expect(yield* engine.queryText({ ...query, query: 'Delta' })).toHaveLength(1);
        expect(yield* engine.queryText({ ...query, query: 'Alpha' })).toHaveLength(0);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'matching reads the index as it stands rather than indexing at query time',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const dataSource = new MockIndexDataSource();
        const spaceId = SpaceId.random();
        dataSource.push([makeObject(spaceId, 'doc-1', 'Unflushed Content')]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });

        const query = { query: 'Unflushed', spaceId: null, includeAllQueues: false, queues: null };
        expect(yield* engine.queryText(query)).toHaveLength(0);

        // Draining is the caller's to do — `Database.flush({ secondaryIndexes: true })` in the app.
        yield* engine.updateSecondaryIndexes(Context.default());
        expect(yield* engine.queryText(query)).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'rebuilds from scratch when its cursor name is retired',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const dataSource = new MockIndexDataSource();
        const spaceId = SpaceId.random();
        dataSource.push([makeObject(spaceId, 'doc-1', 'Rebuilt')]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });
        yield* engine.updateSecondaryIndexes(Context.default());

        // What a migration does to retire a secondary index (see `migrations/tracker`).
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM indexCursor WHERE indexName = 'fts7'`;
        yield* sql`DELETE FROM ftsIndex`;

        expect((yield* engine.updateSecondaryIndexes(Context.default())).updated).toBe(1);
        expect(yield* sql`SELECT rowid FROM ftsIndex`).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );
  });
});
