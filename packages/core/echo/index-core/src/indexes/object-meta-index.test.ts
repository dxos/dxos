//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_DELETED, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, ObjectId, SpaceId } from '@dxos/keys';

import type { IndexerObject } from './interface';
import { ObjectMetaIndex } from './object-meta-index';

const TYPE_PERSON = DXN.parse('dxn:type:example.com/type/Person:0.1.0').toString();
const TYPE_RELATION = DXN.parse('dxn:type:example.com/type/Relation:0.1.0').toString();
const TYPE_RELATION_UPDATED = DXN.parse('dxn:type:example.com/type/RelationUpdated:0.1.0').toString();

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
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId1 = ObjectId.random();
      const objectId2 = ObjectId.random();

      const item1: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        recordId: null,
        data: {
          id: objectId1,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };

      const item2: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-123',
        recordId: null,
        data: {
          id: objectId2,
          [ATTR_TYPE]: TYPE_RELATION,
          [ATTR_RELATION_SOURCE]: DXN.parse(`dxn:echo:${spaceId}:${ObjectId.random()}}`).toString(),
          [ATTR_RELATION_TARGET]: DXN.parse(`dxn:echo:${spaceId}:${ObjectId.random()}}`).toString(),
          [ATTR_DELETED]: false,
        },
      };

      // 1. Initial Insert
      yield* index.update([item1, item2]);

      // Verify Query.
      const results = yield* index.query({ spaceId, typeDxn: TYPE_PERSON });
      expect(results.length).toBe(1);
      expect(results[0].objectId).toBe(objectId1);
      expect(results[0].version).toBe(1);

      const relationResults = yield* index.query({ spaceId, typeDxn: TYPE_RELATION });
      expect(relationResults.length).toBe(1);
      expect(relationResults[0].objectId).toBe(objectId2);
      expect(relationResults[0].entityKind).toBe('relation');
      expect(relationResults[0].source).toBe(item2.data[ATTR_RELATION_SOURCE]);
      expect(relationResults[0].target).toBe(item2.data[ATTR_RELATION_TARGET]);
      expect(relationResults[0].version).toBe(2);

      // 2. Update existing object (item1 matches by queueId)
      const item1Update: IndexerObject = {
        ...item1,
        data: {
          ...item1.data,
          [ATTR_DELETED]: true,
        },
      };

      yield* index.update([item1Update]);

      const updatedResults = yield* index.query({ spaceId, typeDxn: TYPE_PERSON });
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
          [ATTR_TYPE]: TYPE_RELATION_UPDATED,
        },
      };

      yield* index.update([item2Update]);

      const newTypeResults = yield* index.query({ spaceId, typeDxn: TYPE_RELATION_UPDATED });
      expect(newTypeResults.length).toBe(1);
      expect(newTypeResults[0].version).toBe(4);
      expect(newTypeResults[0].objectId).toBe(objectId2);

      const oldTypeResults = yield* index.query({ spaceId, typeDxn: TYPE_RELATION });
      expect(oldTypeResults.length).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );
});
