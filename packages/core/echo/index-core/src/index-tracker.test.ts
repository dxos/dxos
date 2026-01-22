//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { SpaceId } from '@dxos/keys';

import { type IndexCursor, IndexTracker } from './index-tracker';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('IndexTracker', () => {
  it.effect(
    'should store and retrieve index cursors',
    Effect.fnUntraced(function* () {
      const tracker = new IndexTracker();
      yield* tracker.migrate();

      const cursor1: IndexCursor = {
        indexName: 'test-index',
        spaceId: SpaceId.random(),
        sourceName: 'automerge',
        resourceId: 'doc-1',
        cursor: 'heads-1',
      };

      const cursor2: IndexCursor = {
        indexName: 'test-index',
        spaceId: null,
        sourceName: 'queue',
        resourceId: 'queue-1',
        cursor: 123,
      };

      // Test Insert
      yield* tracker.updateCursors([cursor1, cursor2]);

      // Test Query All for index
      const results = yield* tracker.queryCursors({ indexName: 'test-index' });
      expect(results.length).toBe(2);
      expect(results).toContainEqual(cursor1);
      expect(results).toContainEqual(cursor2);

      // Test Query with Filter
      const filtered = yield* tracker.queryCursors({ indexName: 'test-index', sourceName: 'automerge' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(cursor1);

      // Test Update
      const updatedCursor1 = { ...cursor1, cursor: 'heads-2' };
      yield* tracker.updateCursors([updatedCursor1]);

      const resultsAfterUpdate = yield* tracker.queryCursors({ indexName: 'test-index', resourceId: 'doc-1' });
      expect(resultsAfterUpdate[0].cursor).toBe('heads-2');

      // Test null handling (empty string in DB)
      const resultsNullSpace = yield* tracker.queryCursors({ indexName: 'test-index', spaceId: null });
      expect(resultsNullSpace.length).toBe(1);
      expect(resultsNullSpace[0]).toEqual(cursor2);
    }, Effect.provide(TestLayer)),
  );
});
