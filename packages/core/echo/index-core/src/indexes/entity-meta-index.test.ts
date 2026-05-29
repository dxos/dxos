//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_DELETED, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

import type { IndexerObject } from './interface';
import { EntityMetaIndex } from './entity-meta-index';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');
const TYPE_PERSON_VERSIONLESS = DXN.make('com.example.type.person');
const TYPE_RELATION = DXN.make('com.example.type.relation', '0.1.0');
const TYPE_RELATION_UPDATED = DXN.make('com.example.type.relationUpdated', '0.1.0');
const TYPE_WITH_UNDERSCORE = DXN.make('com.example.type.personextra', '0.1.0');
const TYPE_WITH_UNDERSCORE_VERSIONLESS = DXN.make('com.example.type.personextra');
const TYPE_UNDERSCORE_FALSE_POSITIVE = DXN.make('com.example.type.personaextra', '0.1.0');

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('EntityMetaIndex', () => {
  it.effect('should match versioned types when queried by versionless type', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId = EntityId.random();

      const item: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectId,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };

      yield* index.update([item]);

      const results = yield* index.query({ spaceId, typeDXN: TYPE_PERSON_VERSIONLESS });
      expect(results.map((_) => _.objectId)).toEqual([objectId]);

      const otherTypeResults = yield* index.query({
        spaceId,
        typeDXN: DXN.make('com.example.type.other'),
      });
      expect(otherTypeResults).toEqual([]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should not treat LIKE wildcards in versionless type queries', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectIdMatch = EntityId.random();
      const objectIdFalsePositive = EntityId.random();

      const match: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectIdMatch,
          [ATTR_TYPE]: TYPE_WITH_UNDERSCORE,
          [ATTR_DELETED]: false,
        },
      };

      // Would match prior implementation because '_' is a LIKE wildcard.
      const falsePositive: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectIdFalsePositive,
          [ATTR_TYPE]: TYPE_UNDERSCORE_FALSE_POSITIVE,
          [ATTR_DELETED]: false,
        },
      };

      yield* index.update([match, falsePositive]);

      const queryResults = yield* index.query({ spaceId, typeDXN: TYPE_WITH_UNDERSCORE_VERSIONLESS });
      expect(queryResults.map((_) => _.objectId)).toEqual([objectIdMatch]);

      const queryTypesResults = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_WITH_UNDERSCORE_VERSIONLESS],
        includeAllQueues: true,
      });
      expect(queryTypesResults.map((_) => _.objectId)).toEqual([objectIdMatch]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should store and update object metadata', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId1 = EntityId.random();
      const objectId2 = EntityId.random();

      const item1: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectId1,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };

      const item2: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-123',
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectId2,
          [ATTR_TYPE]: TYPE_RELATION,
          [ATTR_RELATION_SOURCE]: EID.make({ spaceId: spaceId, entityId: EntityId.random() }),
          [ATTR_RELATION_TARGET]: EID.make({ spaceId: spaceId, entityId: EntityId.random() }),
          [ATTR_DELETED]: false,
        },
      };

      // 1. Initial Insert
      yield* index.update([item1, item2]);

      // Verify Query.
      const results = yield* index.query({ spaceId, typeDXN: TYPE_PERSON });
      expect(results.length).toBe(1);
      expect(results[0].objectId).toBe(objectId1);
      expect(results[0].version).toBe(1);

      const relationResults = yield* index.query({ spaceId, typeDXN: TYPE_RELATION });
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

      const updatedResults = yield* index.query({ spaceId, typeDXN: TYPE_PERSON });
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

      const newTypeResults = yield* index.query({ spaceId, typeDXN: TYPE_RELATION_UPDATED });
      expect(newTypeResults.length).toBe(1);
      expect(newTypeResults[0].version).toBe(4);
      expect(newTypeResults[0].objectId).toBe(objectId2);

      const oldTypeResults = yield* index.query({ spaceId, typeDXN: TYPE_RELATION });
      expect(oldTypeResults.length).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should support queryAll/queryTypes/queryRelations', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId1 = EntityId.random();
      const objectId2 = EntityId.random();
      const relationId = EntityId.random();

      const item1: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectId1,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };

      const item2: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: objectId2,
          [ATTR_TYPE]: TYPE_RELATION,
          [ATTR_DELETED]: false,
        },
      };

      const relation: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: relationId,
          [ATTR_TYPE]: TYPE_RELATION,
          [ATTR_RELATION_SOURCE]: EID.make({ entityId: objectId1 }),
          [ATTR_RELATION_TARGET]: EID.make({ entityId: objectId2 }),
          [ATTR_DELETED]: false,
        },
      };

      yield* index.update([item1, item2, relation]);

      const all = yield* index.queryAll({ spaceIds: [spaceId], includeAllQueues: true });
      expect(all.map((_) => _.objectId).sort()).toEqual([objectId1, objectId2, relationId].sort());

      const allNoQueues = yield* index.queryAll({ spaceIds: [spaceId] });
      expect(allNoQueues).toEqual([]);

      const types = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_PERSON, TYPE_RELATION],
        includeAllQueues: true,
      });
      expect(types.map((_) => _.objectId).sort()).toEqual([objectId1, objectId2, relationId].sort());

      const onlyPerson = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_PERSON],
        includeAllQueues: true,
      });
      expect(onlyPerson.map((_) => _.objectId)).toEqual([objectId1]);

      const onlyPersonVersionless = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_PERSON_VERSIONLESS],
        includeAllQueues: true,
      });
      expect(onlyPersonVersionless.map((_) => _.objectId)).toEqual([objectId1]);

      const notPerson = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_PERSON],
        inverted: true,
        includeAllQueues: true,
      });
      expect(notPerson.map((_) => _.objectId).sort()).toEqual([objectId2, relationId].sort());

      const notPersonVersionless = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [TYPE_PERSON_VERSIONLESS],
        inverted: true,
        includeAllQueues: true,
      });
      expect(notPersonVersionless.map((_) => _.objectId).sort()).toEqual([objectId2, relationId].sort());

      const emptyTypes = yield* index.queryTypes({ spaceIds: [spaceId], typeDxns: [] });
      expect(emptyTypes).toEqual([]);

      const notEmptyTypes = yield* index.queryTypes({
        spaceIds: [spaceId],
        typeDxns: [],
        inverted: true,
        includeAllQueues: true,
      });
      expect(notEmptyTypes.map((_) => _.objectId).sort()).toEqual([objectId1, objectId2, relationId].sort());

      const bySource = yield* index.queryRelations({
        endpoint: 'source',
        anchorDxns: [EID.make({ entityId: objectId1 })],
      });
      expect(bySource.map((_) => _.objectId)).toEqual([relationId]);

      const byTarget = yield* index.queryRelations({
        endpoint: 'target',
        anchorDxns: [EID.make({ entityId: objectId2 })],
      });
      expect(byTarget.map((_) => _.objectId)).toEqual([relationId]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should set createdAt and updatedAt from source timestamp on insert and updatedAt on update', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const objectId = EntityId.random();
      const queueId = EntityId.random();

      const insertTimestamp = 1700000000000;
      const item: IndexerObject = {
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        updatedAt: insertTimestamp,
        data: {
          id: objectId,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };

      yield* index.update([item]);

      const results = yield* index.query({ spaceId, typeDXN: TYPE_PERSON });
      expect(results.length).toBe(1);
      expect(results[0].createdAt).toBe(insertTimestamp);
      expect(results[0].updatedAt).toBe(insertTimestamp);

      const updateTimestamp = 1700001000000;
      yield* index.update([{ ...item, updatedAt: updateTimestamp, data: { ...item.data, [ATTR_DELETED]: true } }]);

      const updated = yield* index.query({ spaceId, typeDXN: TYPE_PERSON });
      expect(updated[0].createdAt).toBe(insertTimestamp);
      expect(updated[0].updatedAt).toBe(updateTimestamp);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should query by time range', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const queueId1 = EntityId.random();
      const queueId2 = EntityId.random();
      const objectId1 = EntityId.random();
      const objectId2 = EntityId.random();

      const earlyTimestamp = 1700000000000;
      const midpoint = 1700000500000;
      const lateTimestamp = 1700001000000;

      yield* index.update([
        {
          spaceId,
          queueId: queueId1,
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          updatedAt: earlyTimestamp,
          data: { id: objectId1, [ATTR_TYPE]: TYPE_PERSON, [ATTR_DELETED]: false },
        },
      ]);

      yield* index.update([
        {
          spaceId,
          queueId: queueId2,
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          updatedAt: lateTimestamp,
          data: { id: objectId2, [ATTR_TYPE]: TYPE_PERSON, [ATTR_DELETED]: false },
        },
      ]);

      // Query all -- both should match.
      const all = yield* index.queryByTimeRange({ spaceIds: [spaceId], includeAllQueues: true });
      expect(all.map((_) => _.objectId).sort()).toEqual([objectId1, objectId2].sort());

      // Query only objects updated after midpoint (object2 has lateTimestamp).
      const afterMid = yield* index.queryByTimeRange({
        spaceIds: [spaceId],
        updatedAfter: midpoint,
        includeAllQueues: true,
      });
      expect(afterMid.map((_) => _.objectId)).toEqual([objectId2]);

      // Query only objects created before midpoint (object1 has earlyTimestamp).
      const beforeMid = yield* index.queryByTimeRange({
        spaceIds: [spaceId],
        createdBefore: midpoint,
        includeAllQueues: true,
      });
      expect(beforeMid.map((_) => _.objectId)).toEqual([objectId1]);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should round-trip queueNamespace and persist it through updates', () =>
    Effect.gen(function* () {
      const index = new EntityMetaIndex();
      yield* index.migrate();

      const spaceId = SpaceId.random();
      const traceQueueId = EntityId.random();
      const traceObjectId = EntityId.random();

      // Initial insert with 'trace' namespace.
      const traceItem: IndexerObject = {
        spaceId,
        queueId: traceQueueId,
        queueNamespace: 'trace',
        documentId: null,
        recordId: null,
        updatedAt: Date.now(),
        data: {
          id: traceObjectId,
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_DELETED]: false,
        },
      };
      yield* index.update([traceItem]);

      const initial = yield* index.queryAll({ spaceIds: [spaceId], includeAllQueues: true });
      expect(initial).toHaveLength(1);
      expect(initial[0].queueNamespace).toBe('trace');

      // Re-index the same object: the UPDATE branch must preserve the namespace.
      yield* index.update([{ ...traceItem, updatedAt: Date.now() + 1 }]);

      const afterUpdate = yield* index.queryAll({ spaceIds: [spaceId], includeAllQueues: true });
      expect(afterUpdate).toHaveLength(1);
      expect(afterUpdate[0].queueNamespace).toBe('trace');
    }).pipe(Effect.provide(TestLayer)),
  );
});
