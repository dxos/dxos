//
// Copyright 2026 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ObjectId, SpaceId } from '@dxos/keys';

import type { IndexerObject } from './interface';
import { ReverseRefIndex } from './reverse-ref-index';

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
      const sourceObjectId = ObjectId.random();
      const targetObjectId = ObjectId.random();
      const targetDxn = `dxn:echo:@:${targetObjectId}`;

      // First create an object in objectMeta.
      const sourceObject: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          contact: { '/': targetDxn },
        } as any,
      };

      // Now update reverseRefIndex.
      yield* reverseRefIndex.update([sourceObject]);

      // Query references to target.
      const results = yield* reverseRefIndex.query(targetDxn);
      expect(results.length).toBe(1);
      expect(results[0].targetDxn).toBe(targetDxn);
      expect(results[0].propPath).toBe('contact');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle nested references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();

      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = ObjectId.random();
      const targetObjectId1 = ObjectId.random();
      const targetObjectId2 = ObjectId.random();
      const targetDxn1 = `dxn:echo:@:${targetObjectId1}`;
      const targetDxn2 = `dxn:echo:@:${targetObjectId2}`;

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          nested: {
            deep: {
              ref: { '/': targetDxn1 },
            },
          },
          simple: { '/': targetDxn2 },
        } as any,
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results1 = yield* reverseRefIndex.query(targetDxn1);
      expect(results1.length).toBe(1);
      expect(results1[0].propPath).toBe('nested.deep.ref');

      const results2 = yield* reverseRefIndex.query(targetDxn2);
      expect(results2.length).toBe(1);
      expect(results2[0].propPath).toBe('simple');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle array references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();

      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = ObjectId.random();
      const targetObjectId1 = ObjectId.random();
      const targetObjectId2 = ObjectId.random();
      const targetDxn1 = `dxn:echo:@:${targetObjectId1}`;
      const targetDxn2 = `dxn:echo:@:${targetObjectId2}`;

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          items: [{ '/': targetDxn1 }, { '/': targetDxn2 }],
        } as any,
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results1 = yield* reverseRefIndex.query(targetDxn1);
      expect(results1.length).toBe(1);
      expect(results1[0].propPath).toBe('items.0');

      const results2 = yield* reverseRefIndex.query(targetDxn2);
      expect(results2.length).toBe(1);
      expect(results2[0].propPath).toBe('items.1');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should update references on object change', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();

      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const queueId = ObjectId.random();
      const sourceObjectId = ObjectId.random();
      const targetObjectId1 = ObjectId.random();
      const targetObjectId2 = ObjectId.random();
      const targetDxn1 = `dxn:echo:@:${targetObjectId1}`;
      const targetDxn2 = `dxn:echo:@:${targetObjectId2}`;

      // Initial object with reference to target1.
      const sourceObject: IndexerObject = {
        spaceId,
        queueId,
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          contact: { '/': targetDxn1 },
        } as any,
      };

      yield* reverseRefIndex.update([sourceObject]);

      let results1 = yield* reverseRefIndex.query(targetDxn1);
      expect(results1.length).toBe(1);

      // Update object to reference target2 instead.
      const updatedObject: IndexerObject = {
        spaceId,
        queueId,
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          contact: { '/': targetDxn2 },
        } as any,
      };

      yield* reverseRefIndex.update([updatedObject]);

      // Old reference should be gone.
      results1 = yield* reverseRefIndex.query(targetDxn1);
      expect(results1.length).toBe(0);

      // New reference should exist.
      const results2 = yield* reverseRefIndex.query(targetDxn2);
      expect(results2.length).toBe(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should handle objects without references', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();

      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = ObjectId.random();

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: ObjectId.random(),
        documentId: null,
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          name: 'Test Object',
          count: 42,
        } as any,
      };

      yield* reverseRefIndex.update([sourceObject]);

      // Should not throw and no results for random DXN.
      const results = yield* reverseRefIndex.query('dxn:echo:@:nonexistent');
      expect(results.length).toBe(0);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('should work with documentId instead of queueId', () =>
    Effect.gen(function* () {
      const reverseRefIndex = new ReverseRefIndex();

      yield* reverseRefIndex.migrate();

      const spaceId = SpaceId.random();
      const sourceObjectId = ObjectId.random();
      const targetObjectId = ObjectId.random();
      const targetDxn = `dxn:echo:@:${targetObjectId}`;

      const sourceObject: IndexerObject = {
        spaceId,
        queueId: null,
        documentId: 'doc-123',
        data: {
          id: sourceObjectId,
          '@kind': 'object',
          '@type': 'example.Type',
          ref: { '/': targetDxn },
        } as any,
      };

      yield* reverseRefIndex.update([sourceObject]);

      const results = yield* reverseRefIndex.query(targetDxn);
      expect(results.length).toBe(1);
      expect(results[0].propPath).toBe('ref');
    }).pipe(Effect.provide(TestLayer)),
  );
});
