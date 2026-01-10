//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { ObjectId, SpaceId } from '@dxos/keys';

import { type DataSourceCursor, type IndexDataSource, IndexEngine } from './index-engine';
import { type IndexCursor, IndexTracker } from './index-tracker';
import { FtsIndex, type IndexerObject, ObjectMetaIndex, ReverseRefIndex } from './indexes';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
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
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.sync(() => {
      const results: { object: IndexerObject; hash: string }[] = [];

      for (const [, entry] of this._state.entries()) {
        const { object, hash } = entry;

        // Find cursor for this object
        // The engine passes cursors filtered by sourceName.
        // We need to find the specific cursor for this resource (document).
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

      // Apply limit if needed (simplistic logic)
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
    const metaIndex = new ObjectMetaIndex();
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
        recordId: null,
        data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.Type', title: 'Hello' },
      };

      dataSource.push([obj1]);

      // First update.
      const { updated } = yield* engine.update(dataSource, { spaceId });
      // Updates objectMeta, FTS, and reverseRef indexes.
      expect(updated).toBe(2);

      // Verify using the SAME index instance
      const results1 = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.Type' });
      expect(results1).toHaveLength(1);
      expect(results1[0].objectId).toBe(obj1.data.id);
      expect(results1[0].version).toBeGreaterThan(0);

      // Verify FTS index gets updated.
      const ftsResults1 = yield* ftsIndex.query('Hello');
      expect(ftsResults1.length).toBeGreaterThan(0);
      expect(ftsResults1.some((row: any) => String(row.snapshot).includes('Hello'))).toBe(true);

      // Update object.
      const obj1Updated: IndexerObject = {
        spaceId,
        documentId: obj1.documentId,
        queueId: null,
        recordId: null,
        data: { id: obj1.data.id, [ATTR_TYPE]: obj1.data[ATTR_TYPE], title: 'Hello World' },
      };
      dataSource.push([obj1Updated]);

      // Second update.
      const { updated: updated2 } = yield* engine.update(dataSource, { spaceId });
      expect(updated2).toBe(2);

      // Verify update
      const results2 = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.Type' });
      expect(results2).toHaveLength(1);
      expect(results2[0].objectId).toBe(obj1Updated.data.id);
      expect(results2[0].version).toBeGreaterThan(results1[0].version);

      const ftsResults2 = yield* ftsIndex.query('World');
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
          documentId: 'd1',
          recordId: null,
          data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.TypeA', val: 1 },
        },
        {
          spaceId,
          queueId: null,
          documentId: 'd2',
          recordId: null,
          data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.TypeA', val: 2 },
        },
        {
          spaceId,
          queueId: null,
          documentId: 'd3',
          recordId: null,
          data: { id: ObjectId.random(), [ATTR_TYPE]: 'test.TypeB', val: 3 },
        },
      ];

      dataSource.push(objects);

      yield* engine.update(dataSource, { spaceId });

      const resultsA = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.TypeA' });
      expect(resultsA).toHaveLength(2);

      const resultsB = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.TypeB' });
      expect(resultsB).toHaveLength(1);

      const ftsResults = yield* ftsIndex.query('TypeA');
      expect(ftsResults).toHaveLength(2);
    }, Effect.provide(TestLayer)),
  );
});
