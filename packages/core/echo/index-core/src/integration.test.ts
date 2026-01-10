//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_DELETED, ATTR_KIND, ATTR_TYPE } from '@dxos/echo/internal';
import { Reference, encodeReference } from '@dxos/echo-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

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
 * Mock data source that simulates Echo objects with references.
 */
class MockEchoDataSource implements IndexDataSource {
  readonly sourceName = 'mock-echo';

  private _state = new Map<string, { object: IndexerObject; hash: string }>();

  push(objects: IndexerObject[]) {
    for (const obj of objects) {
      invariant(obj.documentId, 'documentId is required');
      this._state.set(`${obj.spaceId}:${obj.documentId}:${obj.data.id}`, {
        object: obj,
        hash: Math.random().toString(36).substring(7),
      });
    }
  }

  clear() {
    this._state.clear();
  }

  getChangedObjects(
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.sync(() => {
      const results: { object: IndexerObject; hash: string; key: string }[] = [];

      for (const [key, entry] of this._state.entries()) {
        const { object, hash } = entry;

        const cursor = cursors.find((c) => c.spaceId === object.spaceId && c.resourceId === object.documentId);

        let include = false;
        if (!cursor) {
          include = true;
        } else {
          include = cursor.cursor !== hash;
        }

        if (include) {
          results.push({ object, hash, key });
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

/**
 * Helper to create an Echo-like object.
 */
const createEchoObject = (spaceId: SpaceId, documentId: string, data: Record<string, any>): IndexerObject => ({
  spaceId,
  documentId,
  queueId: null,
  recordId: null,
  data: {
    id: ObjectId.random(),
    [ATTR_TYPE]: DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString(),
    [ATTR_KIND]: 'object',
    [ATTR_DELETED]: false,
    ...data,
  },
});

describe('Integration Tests', () => {
  it.effect(
    'should index and query Echo objects by type',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockEchoDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      // Create Person objects.
      const person1 = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Person',
        name: 'Alice',
        age: 30,
      });
      const person2 = createEchoObject(spaceId, 'doc-2', {
        [ATTR_TYPE]: 'example.com/type/Person',
        name: 'Bob',
        age: 25,
      });

      // Create Task objects.
      const task1 = createEchoObject(spaceId, 'doc-3', {
        [ATTR_TYPE]: 'example.com/type/Task',
        title: 'Write tests',
        done: false,
      });

      dataSource.push([person1, person2, task1]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Query by Person type.
      const persons = yield* Effect.promise(() =>
        indexer.execQuery({
          type: { spaceId: spaceId.toString(), typeDxn: 'example.com/type/Person' },
        }),
      );

      expect(persons).toHaveLength(2);

      // Query by Task type.
      const tasks = yield* Effect.promise(() =>
        indexer.execQuery({
          type: { spaceId: spaceId.toString(), typeDxn: 'example.com/type/Task' },
        }),
      );

      expect(tasks).toHaveLength(1);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should find Echo objects via full-text search',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockEchoDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      // Create documents with different content.
      const doc1 = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Document',
        title: 'Introduction to TypeScript',
        content: 'TypeScript is a typed superset of JavaScript.',
      });
      const doc2 = createEchoObject(spaceId, 'doc-2', {
        [ATTR_TYPE]: 'example.com/type/Document',
        title: 'Getting Started with React',
        content: 'React is a JavaScript library for building user interfaces.',
      });
      const doc3 = createEchoObject(spaceId, 'doc-3', {
        [ATTR_TYPE]: 'example.com/type/Document',
        title: 'Advanced Python',
        content: 'Python is great for machine learning and data science.',
      });

      dataSource.push([doc1, doc2, doc3]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Search for TypeScript.
      const tsResults = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'TypeScript' },
        }),
      );
      expect(tsResults.length).toBeGreaterThan(0);
      expect(tsResults.some((r) => r.snapshot?.includes('TypeScript'))).toBe(true);

      // Search for JavaScript (should match 2 docs).
      const jsResults = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'JavaScript' },
        }),
      );
      expect(jsResults.length).toBe(2);

      // Search for Python.
      const pyResults = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'Python' },
        }),
      );
      expect(pyResults.length).toBe(1);
      expect(pyResults[0].snapshot).toContain('Python');

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should track and query reverse references',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockEchoDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      // Create a target object.
      const targetId = ObjectId.random();
      const targetDxn = DXN.fromLocalObjectId(targetId).toString();
      const targetRef = encodeReference(Reference.localObjectReference(targetId));

      const target = createEchoObject(spaceId, 'doc-target', {
        [ATTR_TYPE]: 'example.com/type/Tag',
        name: 'Important',
      });
      // Override the generated ID.
      target.data.id = targetId;

      // Create objects that reference the target.
      const source1 = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Task',
        title: 'Task 1',
        tag: targetRef,
      });
      const source2 = createEchoObject(spaceId, 'doc-2', {
        [ATTR_TYPE]: 'example.com/type/Task',
        title: 'Task 2',
        tag: targetRef,
      });

      // Create an object without reference.
      const unrelated = createEchoObject(spaceId, 'doc-3', {
        [ATTR_TYPE]: 'example.com/type/Task',
        title: 'Task 3',
      });

      dataSource.push([target, source1, source2, unrelated]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Query reverse references.
      const refs = yield* Effect.promise(() =>
        indexer.execQuery({
          reverseRef: { targetDxn },
        }),
      );

      // Should find 2 references (source1 and source2 pointing to target).
      expect(refs).toHaveLength(2);
      expect(refs.every((r) => r.targetDxn === targetDxn)).toBe(true);
      expect(refs.every((r) => r.propPath === 'tag')).toBe(true);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should re-index updated objects',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockEchoDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      // Create initial object.
      const objectId = ObjectId.random();
      const original = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Note',
        title: 'Original Title',
        content: 'Some content here.',
      });
      original.data.id = objectId;

      dataSource.push([original]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Verify original is indexed.
      let results = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'Original' },
        }),
      );
      expect(results.length).toBe(1);

      // Update the object.
      dataSource.clear();
      const updated = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Note',
        title: 'Updated Title',
        content: 'Modified content.',
      });
      updated.data.id = objectId;

      dataSource.push([updated]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Verify updated content is searchable.
      results = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'Updated' },
        }),
      );
      expect(results.length).toBe(1);

      // Original content should no longer match (it's replaced).
      results = yield* Effect.promise(() =>
        indexer.execQuery({
          text: { query: 'Original' },
        }),
      );
      expect(results.length).toBe(0);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should emit updated events when objects are indexed',
    Effect.fnUntraced(function* () {
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const dataSource = new MockEchoDataSource();

      const indexer = new Indexer({
        dataSource,
        spaceId,
        runEffect: (effect) => runAndForwardErrors(Effect.provideService(effect, SqlClient.SqlClient, sql)),
        indexCooldownTime: 0,
      });

      yield* Effect.promise(() => indexer.open());

      let eventCount = 0;
      indexer.updated.on(() => {
        eventCount++;
      });

      // Index objects.
      const obj1 = createEchoObject(spaceId, 'doc-1', {
        [ATTR_TYPE]: 'example.com/type/Item',
        name: 'Item 1',
      });
      dataSource.push([obj1]);
      yield* Effect.promise(() => indexer.updateIndexes());

      // Updated event should be emitted when objects are indexed.
      // The IndexEngine runs update for each dependent index (FTS, ReverseRef),
      // so we might get multiple events if each index has changes.
      expect(eventCount).toBeGreaterThanOrEqual(1);

      yield* Effect.promise(() => indexer.close());
    }, Effect.provide(TestLayer)),
  );
});
