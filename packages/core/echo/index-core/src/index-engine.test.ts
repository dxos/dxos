import { describe, it, expect } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import { SqliteClient } from '@effect/sql-sqlite-node';
import * as Reactivity from '@effect/experimental/Reactivity';
import { IndexEngine, type IndexDataSource, type DataSourceCursor } from './index-engine';
import { IndexTracker, type IndexCursor } from './index-tracker';
import { ObjectMetaIndex } from './indexes/object-meta-index';
import type { IndexerObject } from './indexes/interface';
import { ObjectId, SpaceId } from '@dxos/keys';
import { invariant } from '@dxos/invariant';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

class MockIndexDataSource implements IndexDataSource {
  readonly dataSourceId = 'mock-source';

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

      for (const [key, entry] of this._state.entries()) {
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
    yield* tracker.runMigrations();
    const metaIndex = new ObjectMetaIndex();
    yield* metaIndex.runMigrations();
    return { tracker, metaIndex };
  });

  it.effect(
    'should index and update objects',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex } = yield* setup;

      // Inject dependencies
      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      const obj1: IndexerObject = {
        spaceId,
        documentId: 'doc-1',
        queueId: null,
        data: { id: ObjectId.random(), '@type': 'test.Type', title: 'Hello' } as any,
      };

      dataSource.push([obj1]);

      // First update
      const { updated } = yield* engine.update(dataSource, { spaceId });
      expect(updated).toBe(1);

      // Verify using the SAME index instance
      const results1 = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.Type' });
      expect(results1).toHaveLength(1);
      expect(results1[0].objectId).toBe(obj1.data.id);
      expect(results1[0].version).toBeGreaterThan(0);

      // Update object
      const obj1Updated: IndexerObject = {
        spaceId,
        documentId: obj1.documentId,
        queueId: null,
        data: { id: obj1.data.id, '@type': obj1.data['@type'], title: 'Hello World' } as any,
      };
      dataSource.push([obj1Updated]);

      // Second update
      const { updated: updated2 } = yield* engine.update(dataSource, { spaceId });
      expect(updated2).toBe(1);

      // Verify update
      const results2 = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.Type' });
      expect(results2).toHaveLength(1);
      expect(results2[0].objectId).toBe(obj1Updated.data.id);
      expect(results2[0].version).toBeGreaterThan(results1[0].version);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'should handle multiple objects',
    Effect.fnUntraced(function* () {
      const { tracker, metaIndex } = yield* setup;

      const engine = new IndexEngine({ tracker, objectMetaIndex: metaIndex });
      const dataSource = new MockIndexDataSource();
      const spaceId = SpaceId.random();

      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: null,
          documentId: 'd1',
          data: { id: ObjectId.random(), '@type': 'test.TypeA', val: 1 } as any,
        },
        {
          spaceId,
          queueId: null,
          documentId: 'd2',
          data: { id: ObjectId.random(), '@type': 'test.TypeA', val: 2 } as any,
        },
        {
          spaceId,
          queueId: null,
          documentId: 'd3',
          data: { id: ObjectId.random(), '@type': 'test.TypeB', val: 3 } as any,
        },
      ];

      dataSource.push(objects);

      yield* engine.update(dataSource, { spaceId });

      const resultsA = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.TypeA' });
      expect(resultsA).toHaveLength(2);

      const resultsB = yield* metaIndex.query({ spaceId: spaceId.toString(), typeDxn: 'test.TypeB' });
      expect(resultsB).toHaveLength(1);
    }, Effect.provide(TestLayer)),
  );
});
