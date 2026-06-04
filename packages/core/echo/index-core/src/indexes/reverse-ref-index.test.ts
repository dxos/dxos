//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

import type { IndexerObject } from './interface';
import { ReverseRefIndex } from './reverse-ref-index';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');
const TYPE_EXAMPLE = DXN.make('com.example.type.example', '0.1.0');

const TestLayer = Layer.merge(
  SqliteClient.layer({
    filename: ':memory:',
  }),
  Reactivity.layer,
);

describe('ReverseRefIndex', () => {
  it.effect('should store and query reverse references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = EntityId.random();
      const targetObjectId = EntityId.random();
      const targetDXN = EID.make({ entityId: targetObjectId });

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: 1,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_PERSON,
          contact: { '/': targetDXN },
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results = yield* reverseRefIndex.query({ targetDXN: targetDXN });
      expect(results.length).toBe(1);
      expect(results[0].targetDXN).toBe(targetDXN);
      expect(results[0].propPath).toBe('contact');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle nested references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = EntityId.random();
      const targetObjectId1 = EntityId.random();
      const targetObjectId2 = EntityId.random();
      const targetDxn1 = EID.make({ entityId: targetObjectId1 });
      const targetDxn2 = EID.make({ entityId: targetObjectId2 });

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: 1,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          nested: {
            deep: {
              ref: { '/': targetDxn1 },
            },
          },
          simple: { '/': targetDxn2 },
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results1 = yield* reverseRefIndex.query({ targetDXN: targetDxn1 });
      expect(results1.length).toBe(1);
      expect(results1[0].propPath).toBe('nested.deep.ref');

      const results2 = yield* reverseRefIndex.query({ targetDXN: targetDxn2 });
      expect(results2.length).toBe(1);
      expect(results2[0].propPath).toBe('simple');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle array references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = EntityId.random();
      const targetObjectId1 = EntityId.random();
      const targetObjectId2 = EntityId.random();
      const targetDxn1 = EID.make({ entityId: targetObjectId1 });
      const targetDxn2 = EID.make({ entityId: targetObjectId2 });

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: 1,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          items: [{ '/': targetDxn1 }, { '/': targetDxn2 }],
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results1 = yield* reverseRefIndex.query({ targetDXN: targetDxn1 });
      expect(results1.length).toBe(1);
      expect(results1[0].propPath).toBe('items.0');

      const results2 = yield* reverseRefIndex.query({ targetDXN: targetDxn2 });
      expect(results2.length).toBe(1);
      expect(results2[0].propPath).toBe('items.1');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should update references on object change', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const queueId = EntityId.random();
      const sourceObjectId = EntityId.random();
      const targetObjectId1 = EntityId.random();
      const targetObjectId2 = EntityId.random();
      const targetDxn1 = EID.make({ entityId: targetObjectId1 });
      const targetDxn2 = EID.make({ entityId: targetObjectId2 });
      const recordId = 1;

      // Initial object with reference to target1.
      const sourceObject: IndexerObject = {
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          contact: { '/': targetDxn1 },
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      let results1 = yield* reverseRefIndex.query({ targetDXN: targetDxn1 });
      expect(results1.length).toBe(1);

      // Update object to reference target2 instead (same recordId).
      const updatedObject: IndexerObject = {
        spaceId,
        queueId,
        queueNamespace: 'data',
        documentId: null,
        recordId,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          contact: { '/': targetDxn2 },
        },
      };

      yield* reverseRefIndex.update([updatedObject]);

      // Old reference should be gone.
      results1 = yield* reverseRefIndex.query({ targetDXN: targetDxn1 });
      expect(results1.length).toBe(0);

      // New reference should exist.
      const results2 = yield* reverseRefIndex.query({ targetDXN: targetDxn2 });
      expect(results2.length).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle objects without references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = EntityId.random();

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: 1,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          name: 'Test Object',
          count: 42,
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      // Should not throw and no results for random DXN.
      const results = yield* reverseRefIndex.query({ targetDXN: EID.make({ entityId: EntityId.random() }) });
      expect(results.length).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should work with documentId instead of queueId', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();
      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = EntityId.random();
      const targetObjectId = EntityId.random();
      const targetDXN = EID.make({ entityId: targetObjectId });

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-123',
        recordId: 1,
        updatedAt: Date.now(),
        data: {
          id: sourceObjectId,
          [ATTR_TYPE]: TYPE_EXAMPLE,
          ref: { '/': targetDXN },
        },
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results = yield* reverseRefIndex.query({ targetDXN: targetDXN });
      expect(results.length).toBe(1);
      expect(results[0].propPath).toBe('ref');
    }).pipe(Effect.provide(TestLayer)),
  );
});
