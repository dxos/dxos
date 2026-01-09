import { SqliteClient } from '@effect/sql-sqlite-node';
import { Effect, Layer } from 'effect';
import { describe, it, expect } from '@effect/vitest';
import * as Reactivity from '@effect/experimental/Reactivity';
import { ObjectMetaIndex, ObjectMeta } from './object-meta-index';
import { IndexerObject } from '../indexer-object';
import { SpaceId, ObjectId } from '@dxos/keys';

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('ObjectMetaIndex', () => {
  it.effect('should store and update object metadata', () =>
    Effect.gen(function* () {
      const index = new ObjectMetaIndex();
      yield* index.runMigrations();

      const spaceId = SpaceId.random();
      const objectId1 = ObjectId.random();
      const objectId2 = ObjectId.random();

      const item1: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        data: {
          id: objectId1,
          '@kind': 'object',
          '@type': 'example.Type' as any,
          '@deleted': false,
        } as any,
      };

      const item2: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-123', // Assuming documentId is string
        data: {
          id: objectId2,
          '@kind': 'relation',
          '@type': 'example.Relation' as any,
          source: 'source-id',
          target: 'target-id',
          '@deleted': false,
        } as any,
      };

      // 1. Initial Insert
      yield* index.update([item1, item2]);

      // Verify Query
      const results = yield* index.query({ spaceId, typeDxn: 'example.Type' as any });
      expect(results.length).toBe(1);
      expect(results[0].objectId).toBe(objectId1);
      expect(results[0].version).toBe(1);

      const relationResults = yield* index.query({ spaceId, typeDxn: 'example.Relation' as any });
      expect(relationResults.length).toBe(1);
      expect(relationResults[0].objectId).toBe(objectId2);
      expect(relationResults[0].entityKind).toBe('relation');
      expect(relationResults[0].source).toBe('source-id');
      expect(relationResults[0].target).toBe('target-id');
      expect(relationResults[0].version).toBe(2);

      // 2. Update existing object (item1 matches by queueId)
      const item1Update: IndexerObject = {
        ...item1,
        data: {
          ...item1.data,
          '@deleted': true,
        } as any,
      };

      yield* index.update([item1Update]);

      const updatedResults = yield* index.query({ spaceId, typeDxn: 'example.Type' });
      // Depending on implementation, query might filter deleted or not.
      // Current implementation is SELECT * without deleted filter for queryType
      expect(updatedResults.length).toBe(1);
      expect(updatedResults[0].deleted).toBe(true);
      expect(updatedResults[0].version).toBe(3); // Incremented globally

      // 3. Update existing object by documentId (item2)
      const item2Update: IndexerObject = {
        ...item2,
        data: {
          ...item2.data,
          '@type': 'example.RelationUpdated' as any,
        } as any,
      };

      yield* index.update([item2Update]);

      const newTypeResults = yield* index.query({ spaceId, typeDxn: 'example.RelationUpdated' as any });
      expect(newTypeResults.length).toBe(1);
      expect(newTypeResults[0].version).toBe(4);
      expect(newTypeResults[0].objectId).toBe(objectId2);

      const oldTypeResults = yield* index.query({ spaceId, typeDxn: 'example.Relation' as any });
      expect(oldTypeResults.length).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );
});
