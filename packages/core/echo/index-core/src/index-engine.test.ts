//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as SqlClient from 'effect/sql/SqlClient';

import { Context } from '@dxos/context';
import { ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
import { IndexEngine, type IndexingResult } from './index-engine.ts';
import { type IndexCursor, IndexTracker } from './index-tracker.ts';
import { type DocumentActivity, EntityMetaIndex, type IndexerObject } from './indexes/index.ts';
import { TestSqliteLayer as TestLayer } from './testing/index.ts';

const TYPE_DEFAULT = DXN.make('com.example.type.Type', '0.1.0');
const TYPE_A = DXN.make('com.example.type.TypeA', '0.1.0');
const TYPE_B = DXN.make('com.example.type.TypeB', '0.1.0');

class MockIndexDataSource implements IndexDataSource {
  readonly sourceName = 'mock-source';

  /** Whether to say when the limit cut a read short, as a source predating `more` does not. */
  constructor(private readonly _reportsMore = false) {}

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
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more?: boolean }> {
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

      return this._reportsMore
        ? { objects, cursors: newCursors, more: limitedResults.length < results.length }
        : { objects, cursors: newCursors };
    });
  }
}

class ActivityMockDataSource implements IndexDataSource {
  readonly sourceName = 'activity-mock-source';

  constructor(
    private readonly spaceId: SpaceId,
    private readonly documentId: string,
    private readonly objectId: EntityId,
  ) {}

  getChangedObjects(
    _ctx: Context,
    cursors: IndexCursor[],
    opts?: { limit?: number; activity?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; activity?: DocumentActivity[] }> {
    return Effect.sync(() => {
      const seen = cursors.some((cursor) => cursor.resourceId === this.documentId && cursor.cursor === 'v1');
      if (seen) {
        return { objects: [], cursors: [], activity: [] };
      }

      const object: IndexerObject = {
        spaceId: this.spaceId,
        documentId: this.documentId,
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: this.objectId, [ATTR_TYPE]: TYPE_DEFAULT, title: 'Activity' },
      };
      const newCursors: DataSourceCursor[] = [{ spaceId: this.spaceId, resourceId: this.documentId, cursor: 'v1' }];
      const activity: DocumentActivity[] | undefined = opts?.activity
        ? [
            {
              spaceId: this.spaceId,
              documentId: this.documentId,
              full: true,
              changes: [{ time: 1700000000000, ops: 1 }],
            },
          ]
        : undefined;

      return { objects: [object], cursors: newCursors, activity };
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
    'counts pending migrations before migrating and reports each store applied',
    Effect.fnUntraced(function* () {
      const engine = new IndexEngine(yield* SqlClient.SqlClient);
      const pending = yield* engine.pendingMigrations();
      expect(pending).toBeGreaterThan(0);

      const progress: number[] = [];
      yield* engine.migrate({ onProgress: (applied) => progress.push(applied) });
      expect(progress.at(-1)).toBe(pending);
      expect(progress).toEqual([...progress].sort((a, b) => a - b));
      expect(yield* engine.pendingMigrations()).toBe(0);
    }, Effect.provide(TestLayer)),
  );

  // `done` needs an empty batch, which writes arriving faster than passes never leave; `drained` is
  // what lets a caller waiting for its own writes settle anyway.
  it.effect(
    'reports a batch drained once it indexed everything the source held, before any batch is empty',
    Effect.fnUntraced(function* () {
      const { engine } = yield* setup;
      const spaceId = SpaceId.random();
      const makeObject = (documentId: string): IndexerObject => ({
        spaceId,
        documentId,
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title: documentId },
      });

      const dataSource = new MockIndexDataSource(true);
      dataSource.push(['doc-1', 'doc-2', 'doc-3'].map(makeObject));
      const cut = yield* engine.update(Context.default(), dataSource, { spaceId: null, limit: 2 });
      expect(cut).toMatchObject({ done: false, drained: false });
      const rest = yield* engine.update(Context.default(), dataSource, { spaceId: null, limit: 2 });
      expect(rest).toMatchObject({ done: false, drained: true });
      const empty = yield* engine.update(Context.default(), dataSource, { spaceId: null, limit: 2 });
      expect(empty).toMatchObject({ done: true, drained: true });

      // A source that does not report `more` could have been cut short whenever it returned anything.
      const legacySource = new MockIndexDataSource();
      legacySource.push([makeObject('doc-4')]);
      const legacy = yield* engine.update(Context.default(), legacySource, { spaceId: null, limit: 2 });
      expect(legacy).toMatchObject({ done: false, drained: false });
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'an empty batch still moves the cursors of what it read, and the next goes past them',
    Effect.fnUntraced(function* () {
      const { engine } = yield* setup;
      const reads: DataSourceCursor[][] = [];
      const dataSource: IndexDataSource = {
        sourceName: 'skipping-source',
        getChangedObjects: (_ctx, cursors, opts) =>
          Effect.sync(() => {
            if (opts?.objects !== false) {
              reads.push(cursors);
            }
            const read = cursors.some(({ resourceId, cursor }) => resourceId === 'root' && cursor === 'root@1');
            return {
              objects: [],
              cursors: read ? [] : [{ spaceId: null, resourceId: 'root', cursor: 'root@1' }],
              more: false,
            };
          }),
      };
      const first = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(first).toMatchObject({ done: false, drained: true });
      const second = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(second).toMatchObject({ done: true, drained: true });
      expect(reads.at(-1)).toMatchObject([{ resourceId: 'root', cursor: 'root@1' }]);
    }, Effect.provide(TestLayer)),
  );

  // Each transaction rewrites every page it dirties, so a second stamp per pass doubled the writes.
  it.effect(
    'stamps each object once per pass while the snapshot and reverse-ref legs share a position',
    Effect.fnUntraced(function* () {
      const { engine, metaIndex } = yield* setup;
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();
      const object: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        queueNamespace: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title: 'Hello' },
      };

      dataSource.push([object]);
      yield* engine.update(Context.default(), dataSource, { spaceId: null });
      const [created] = yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT });
      expect(created.version).toBe(1);

      dataSource.push([{ ...object, data: { ...object.data, title: 'Hello World' } }]);
      yield* engine.update(Context.default(), dataSource, { spaceId: null });
      const [updated] = yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT });
      expect(updated.version).toBe(2);
    }, Effect.provide(TestLayer)),
  );

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

      // First update with no data - both sub-indexes report done immediately.
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

      // Update with pending data - sub-indexes process objects, done is false.
      const { updated: updated1, done: done1 } = yield* engine.update(Context.default(), dataSource, { spaceId: null });
      expect(updated1).toBeGreaterThan(0);
      expect(done1).toBe(false);

      // Second update with no new data - all sub-indexes caught up, done is true.
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

  it.effect(
    'activity survives garbage collection and counts a replicated-again document once',
    Effect.fnUntraced(function* () {
      const { engine } = yield* setup;
      const spaceId = SpaceId.random();
      const documentId = 'doc-activity';
      const objectId = EntityId.random();
      const dataSource = new ActivityMockDataSource(spaceId, documentId, objectId);
      const indexAll = Effect.gen(function* () {
        let done = false;
        while (!done) {
          done = (yield* engine.update(Context.default(), dataSource, { spaceId: null })).done;
        }
      });

      yield* indexAll;
      expect(yield* engine.queryActivity({ spaceId })).toEqual([expect.objectContaining({ documentId, changes: 1 })]);

      yield* engine.deleteObjects({ spaceId, documentIds: [documentId], objects: [] });
      expect(yield* engine.queryActivity({ spaceId })).toHaveLength(1);

      yield* indexAll;
      expect(yield* engine.queryActivity({ spaceId })).toEqual([expect.objectContaining({ documentId, changes: 1 })]);
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

        // Draining is the caller's to do - `Database.flush({ secondaryIndexes: true })` in the app.
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

  // Queries share the connection the index writes through, so each waits behind at most one transaction.
  describe('bounded transactions', () => {
    const MAX_OBJECTS = 2;

    /** Documents of several objects each, presented in full until the index records their heads. */
    class DocumentsDataSource implements IndexDataSource {
      readonly sourceName = 'documents-source';
      readonly #documents = new Map<string, { heads: string; objects: IndexerObject[] }>();

      constructor(private readonly _spaceId: SpaceId) {}

      add(documentId: string, count: number): void {
        this.#documents.set(documentId, {
          heads: `${documentId}@1`,
          objects: Array.from({ length: count }, (_, position) => ({
            spaceId: this._spaceId,
            documentId,
            queueId: null,
            queueNamespace: null,
            recordId: null,
            createdAt: null,
            updatedAt: Date.now(),
            data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title: `${documentId} ${position}` },
          })),
        });
      }

      getChangedObjects(
        _ctx: Context,
        cursors: DataSourceCursor[],
      ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more: boolean }> {
        return Effect.sync(() => {
          const objects: IndexerObject[] = [];
          const changed: DataSourceCursor[] = [];
          for (const [documentId, { heads, objects: documentObjects }] of this.#documents) {
            if (!cursors.some((cursor) => cursor.resourceId === documentId && cursor.cursor === heads)) {
              objects.push(...documentObjects.map((object) => ({ ...object })));
              changed.push({ spaceId: this._spaceId, resourceId: documentId, cursor: heads });
            }
          }
          return { objects, cursors: changed, more: false };
        });
      }
    }

    const setupBounded = (yieldBetweenTransactions: () => Promise<void>) =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const engine = new IndexEngine(sql, {
          transactionLimits: { maxObjects: MAX_OBJECTS },
          yieldBetweenTransactions,
        });
        yield* engine.migrate();
        const tracker = new IndexTracker(sql);
        const indexedDocuments = tracker
          .queryCursors({ indexName: 'objectSnapshot', sourceName: 'documents-source' })
          .pipe(Effect.map((cursors) => cursors.map((cursor) => cursor.resourceId).toSorted()));
        return { engine, metaIndex: new EntityMetaIndex(sql), indexedDocuments };
      });

    it.effect(
      'writes a document larger than one transaction over several and marks it indexed with the last',
      Effect.fnUntraced(function* () {
        let yields = 0;
        const { engine, metaIndex, indexedDocuments } = yield* setupBounded(async () => {
          yields++;
        });
        const spaceId = SpaceId.random();
        const source = new DocumentsDataSource(spaceId);
        source.add('doc-1', 5);

        const result = yield* engine.update(Context.default(), source, { spaceId: null });
        expect(yields).toBe(2);
        expect(result).toMatchObject({ updated: 10, drained: true });
        expect(yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT })).toHaveLength(5);
        expect(yield* indexedDocuments).toEqual(['doc-1']);
        expect(yield* engine.update(Context.default(), source, { spaceId: null })).toMatchObject({ done: true });
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a pass closed between transactions marks only the documents it finished',
      Effect.fnUntraced(function* () {
        const ctx = new Context();
        let yields = 0;
        const { engine, metaIndex, indexedDocuments } = yield* setupBounded(async () => {
          // After the second transaction: doc-1 is whole, doc-2 has two of its three objects.
          if (++yields === 2) {
            await ctx.dispose();
          }
        });
        const spaceId = SpaceId.random();
        const source = new DocumentsDataSource(spaceId);
        source.add('doc-1', 2);
        source.add('doc-2', 3);

        expect(yield* engine.update(ctx, source, { spaceId: null })).toMatchObject({ done: false, drained: false });
        expect(yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT })).toHaveLength(4);
        expect(yield* indexedDocuments).toEqual(['doc-1']);

        yield* engine.update(Context.default(), source, { spaceId: null });
        expect(yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT })).toHaveLength(5);
        expect(yield* indexedDocuments).toEqual(['doc-1', 'doc-2']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a pass failing between transactions leaves the unfinished document to the next pass',
      Effect.fnUntraced(function* () {
        let fail = true;
        const { engine, metaIndex, indexedDocuments } = yield* setupBounded(async () => {
          if (fail) {
            throw new Error('Injected failure between transactions.');
          }
        });
        const spaceId = SpaceId.random();
        const source = new DocumentsDataSource(spaceId);
        source.add('doc-1', 5);

        const exit = yield* engine.update(Context.default(), source, { spaceId: null }).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        expect(yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT })).toHaveLength(MAX_OBJECTS);
        expect(yield* indexedDocuments).toEqual([]);

        fail = false;
        yield* engine.update(Context.default(), source, { spaceId: null });
        expect(yield* metaIndex.query({ spaceId, typeDXN: TYPE_DEFAULT })).toHaveLength(5);
        expect(yield* indexedDocuments).toEqual(['doc-1']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a secondary batch holds one transaction of objects, so its cursor advances with each',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setupBounded(async () => {});
        const source = new DocumentsDataSource(SpaceId.random());
        source.add('doc-1', 5);
        yield* engine.update(Context.default(), source, { spaceId: null });

        const batches: number[] = [];
        for (;;) {
          const { updated, done } = yield* engine.updateSecondaryIndexes(Context.default());
          if (done) {
            break;
          }
          batches.push(updated);
        }
        expect(batches).toEqual([2, 2, 1]);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('feeds', () => {
    const FEED_TYPE = DXN.make('org.dxos.type.feed', '0.1.0');

    /** Feed blocks pushed in order; one namespace cursor counts how many were read. */
    class QueueMockDataSource implements IndexDataSource {
      readonly sourceName = 'queue-mock-source';
      readonly #blocks: IndexerObject[] = [];

      push(objects: IndexerObject[]) {
        this.#blocks.push(...objects);
      }

      getChangedObjects(
        _ctx: Context,
        cursors: DataSourceCursor[],
        opts?: { objects?: boolean },
      ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; more: boolean }> {
        return Effect.sync(() => {
          if (opts?.objects === false) {
            return { objects: [], cursors: [], more: false };
          }
          const read = Number(cursors.find((cursor) => cursor.resourceId === 'data')?.cursor ?? 0);
          return {
            objects: this.#blocks.slice(read),
            cursors: [{ spaceId: null, resourceId: 'data', cursor: this.#blocks.length }],
            more: false,
          };
        });
      }
    }

    const makeItem = (
      spaceId: SpaceId,
      queueId: EntityId,
      block: { insertionId: number | null; position?: number },
      data: { id?: EntityId; title: string },
    ): IndexerObject => ({
      spaceId,
      queueId,
      queueNamespace: 'data',
      documentId: null,
      recordId: null,
      queuePosition: block.position ?? null,
      queueInsertionId: block.insertionId,
      createdAt: null,
      updatedAt: Date.now(),
      data: { id: data.id ?? EntityId.random(), [ATTR_TYPE]: TYPE_DEFAULT, title: data.title },
    });

    const feedRows = (engine: IndexEngine, spaceId: SpaceId, queueId: EntityId) =>
      engine.queryAll({ spaceIds: [], queues: [{ spaceId, queueId }] });

    it.effect(
      'indexing a Feed object records its options intent, with the data namespace by default',
      Effect.fnUntraced(function* () {
        const { engine, metaIndex } = yield* setup;
        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const dataSource = new MockIndexDataSource();
        dataSource.push([
          {
            spaceId,
            documentId: 'doc-feed',
            queueId: null,
            queueNamespace: null,
            recordId: null,
            createdAt: null,
            updatedAt: Date.now(),
            data: { id: feedId, [ATTR_TYPE]: FEED_TYPE, name: 'log', retention: { maxLength: 5 } },
          },
        ]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });

        expect(yield* metaIndex.query({ spaceId, typeDXN: FEED_TYPE })).toHaveLength(1);
        const { maxId, intents } = yield* engine.takeFeedOptionsIntents();
        expect(intents).toEqual([
          { kind: 'feed-options', spaceId, feedId, namespace: 'data', options: { retention: { maxLength: 5 } } },
        ]);

        yield* engine.clearFeedOptionsIntents(spaceId, feedId, maxId);
        expect((yield* engine.takeFeedOptionsIntents()).intents).toEqual([]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'records the data namespace for a Feed object whose namespace is not a known one',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const dataSource = new MockIndexDataSource();
        dataSource.push([
          {
            spaceId,
            documentId: 'doc-feed',
            queueId: null,
            queueNamespace: null,
            recordId: null,
            createdAt: null,
            updatedAt: Date.now(),
            data: { id: feedId, [ATTR_TYPE]: FEED_TYPE, namespace: 'other', retention: { maxLength: 5 } },
          },
        ]);
        yield* engine.update(Context.default(), dataSource, { spaceId: null });

        const { intents } = yield* engine.takeFeedOptionsIntents();
        expect(intents).toEqual([
          { kind: 'feed-options', spaceId, feedId, namespace: 'data', options: { retention: { maxLength: 5 } } },
        ]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a queue bounded by updatedSince excludes its older rows before the window limit',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const queueId = EntityId.random();
        const source = new QueueMockDataSource();
        // Ascending ids put the expired rows first in natural order, where an unbounded page would take them.
        const ids = Array.from({ length: 4 }, () => EntityId.random()).sort();
        source.push(
          ids.map((id, index) => ({
            ...makeItem(spaceId, queueId, { insertionId: index + 1 }, { id, title: `item ${index}` }),
            updatedAt: index < 2 ? 1_000 : 5_000,
          })),
        );
        yield* engine.update(Context.default(), source, { spaceId: null });

        const rows = yield* engine.queryAll({
          spaceIds: [],
          queues: [{ spaceId, queueId, updatedSince: 2_000 }],
          window: { kind: 'natural', direction: 'asc', limit: 2 },
        });
        expect(rows.map((row) => row.objectId)).toEqual(ids.slice(2));
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'drops invalid options fields and skips feed items and deleted Feed objects',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const documents = new MockIndexDataSource();
        const makeFeed = (documentId: string, data: Record<string, unknown>): IndexerObject => ({
          spaceId,
          documentId,
          queueId: null,
          queueNamespace: null,
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: { id: EntityId.random(), [ATTR_TYPE]: FEED_TYPE, ...data },
        });
        documents.push([
          makeFeed('doc-1', {
            id: feedId,
            namespace: 'trace',
            indexing: { enabled: false },
            retention: { maxLength: -1 },
          }),
          makeFeed('doc-2', { '@deleted': true, 'retention': { maxLength: 3 } }),
        ]);
        yield* engine.update(Context.default(), documents, { spaceId: null });

        const items = new QueueMockDataSource();
        items.push([
          {
            ...makeItem(spaceId, EntityId.random(), { insertionId: 1 }, { title: 'nested' }),
            data: { id: EntityId.random(), [ATTR_TYPE]: FEED_TYPE },
          },
        ]);
        yield* engine.update(Context.default(), items, { spaceId: null });

        const { intents } = yield* engine.takeFeedOptionsIntents();
        expect(intents).toEqual([
          { kind: 'feed-options', spaceId, feedId, namespace: 'trace', options: { indexing: { enabled: false } } },
        ]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'deleteFeedObjects removes every index row of one feed and leaves other feeds',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const feedA = EntityId.random();
        const feedB = EntityId.random();
        const source = new QueueMockDataSource();
        source.push([
          makeItem(spaceId, feedA, { insertionId: 1 }, { title: 'hello one' }),
          makeItem(spaceId, feedA, { insertionId: 2 }, { title: 'hello two' }),
          makeItem(spaceId, feedB, { insertionId: 3 }, { title: 'hello three' }),
        ]);
        yield* engine.update(Context.default(), source, { spaceId: null });
        yield* engine.updateSecondaryIndexes(Context.default());

        expect(yield* engine.deleteFeedObjects({ spaceId, queueId: feedA })).toBe(2);
        expect(yield* feedRows(engine, spaceId, feedA)).toEqual([]);
        expect(yield* feedRows(engine, spaceId, feedB)).toHaveLength(1);

        const sql = yield* SqlClient.SqlClient;
        expect(yield* sql`SELECT recordId FROM objectSnapshot`).toHaveLength(1);
        const text = yield* engine.queryText({
          query: 'hello',
          spaceId: [spaceId],
          includeAllQueues: true,
          queues: null,
        });
        expect(text.map((row) => row.queueId)).toEqual([feedB]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'purgeFeedBlocks removes a row only when its current block was trimmed',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const liveId = EntityId.random();
        const source = new QueueMockDataSource();
        source.push([
          makeItem(spaceId, feedId, { insertionId: 1 }, { id: liveId, title: 'v1' }),
          makeItem(spaceId, feedId, { insertionId: 2 }, { title: 'other' }),
          makeItem(spaceId, feedId, { insertionId: 3 }, { id: liveId, title: 'v2' }),
        ]);
        yield* engine.update(Context.default(), source, { spaceId: null });

        // The live object's older block is gone, but its newer one still backs the row.
        expect(
          yield* engine.purgeFeedBlocks({
            spaceId,
            queueId: feedId,
            blocks: [
              { insertionId: 1, position: null },
              { insertionId: 2, position: null },
            ],
          }),
        ).toBe(1);
        expect((yield* feedRows(engine, spaceId, feedId)).map((row) => row.objectId)).toEqual([liveId]);

        expect(
          yield* engine.purgeFeedBlocks({ spaceId, queueId: feedId, blocks: [{ insertionId: 3, position: null }] }),
        ).toBe(1);
        expect(yield* feedRows(engine, spaceId, feedId)).toEqual([]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'purgeFeedBlocks matches a row that predates queueInsertionId by its position',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const feedId = EntityId.random();
        const source = new QueueMockDataSource();
        source.push([makeItem(spaceId, feedId, { insertionId: null, position: 7 }, { title: 'legacy' })]);
        yield* engine.update(Context.default(), source, { spaceId: null });

        expect(
          yield* engine.purgeFeedBlocks({ spaceId, queueId: feedId, blocks: [{ insertionId: 99, position: 8 }] }),
        ).toBe(0);
        expect(
          yield* engine.purgeFeedBlocks({ spaceId, queueId: feedId, blocks: [{ insertionId: 99, position: 7 }] }),
        ).toBe(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a seeded cursor is read by the next pass and deleted once it stands at the finished value',
      Effect.fnUntraced(function* () {
        const { engine } = yield* setup;
        const spaceId = SpaceId.random();
        const tracker = new IndexTracker(yield* SqlClient.SqlClient);
        yield* engine.seedCursor({ sourceName: 'queue', spaceId, resourceId: 'backfill/data/feed', cursor: '' });
        const seeded = yield* tracker.queryCursorsBySource({ sourceName: 'queue' });
        expect([...seeded.keys()].sort()).toEqual([...IndexEngine.primaryIndexNames].sort());

        const finish = { sourceName: 'queue', spaceId, resourceIds: ['backfill/data/feed'], cursor: 'done' };
        yield* engine.deleteFinishedCursors(finish);
        expect((yield* tracker.queryCursorsBySource({ sourceName: 'queue' })).size).toBe(2);

        yield* engine.seedCursor({ sourceName: 'queue', spaceId, resourceId: 'backfill/data/feed', cursor: 'done' });
        yield* engine.deleteFinishedCursors(finish);
        expect((yield* tracker.queryCursorsBySource({ sourceName: 'queue' })).size).toBe(0);
      }, Effect.provide(TestLayer)),
    );
  });
});
