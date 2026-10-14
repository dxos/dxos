//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';

import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { TestSqliteLayer as TestLayer } from '../testing/index.ts';
import { EntityMetaIndex } from './entity-meta-index.ts';
import type { IndexerObject } from './interface.ts';
import { ObjectSnapshotIndex } from './object-snapshot-index.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');

const migrated = Effect.fnUntraced(function* () {
  const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
  yield* store.migrate();
  return { store };
});

describe('ObjectSnapshotIndex', () => {
  it.effect(
    'returns snapshots for all present recordIds',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const objects: IndexerObject[] = [
        {
          spaceId,
          queueId: EntityId.random(),
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'alpha' },
        },
        {
          spaceId,
          queueId: EntityId.random(),
          queueNamespace: 'data',
          documentId: null,
          recordId: null,
          createdAt: null,
          updatedAt: Date.now(),
          data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'beta' },
        },
      ];

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);

      const recordIds = objects.map((o) => o.recordId!);
      const snapshots = yield* store.querySnapshotsJSON(recordIds);

      expect(snapshots).toHaveLength(2);
      const snapshotMap = new Map(snapshots.map((s) => [s.recordId, s.snapshot]));
      expect((snapshotMap.get(objects[0].recordId!) as any).value).toBe('alpha');
      expect((snapshotMap.get(objects[1].recordId!) as any).value).toBe('beta');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'omits stale recordIds not present in the store',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const object: IndexerObject = {
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'present' },
      };

      yield* metaIndex.update([object]);
      yield* metaIndex.lookupRecordIds([object]);
      yield* store.update([object]);

      // Query with the real id plus a stale/non-existent id.
      const staleId = 99999;
      const snapshots = yield* store.querySnapshotsJSON([object.recordId!, staleId]);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].recordId).toBe(object.recordId!);
      expect((snapshots[0].snapshot as any).value).toBe('present');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    "stores a document object's meta and heads; an update without heads clears them",
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const sql = yield* SqlClient.SqlClient;
      const metaIndex = new EntityMetaIndex(sql);
      yield* metaIndex.migrate();

      const id = EntityId.random();
      const object: IndexerObject = {
        spaceId: SpaceId.random(),
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id, [ATTR_TYPE]: TYPE_PERSON, [ATTR_META]: { keys: [], tags: ['t'] }, value: 'alpha' },
        heads: ['h1', 'h2'],
      };
      yield* metaIndex.update([object]);
      yield* metaIndex.lookupRecordIds([object]);
      yield* store.update([object]);
      const [backing] = yield* store.queryBackings([object.recordId!]);
      expect(backing.heads).toEqual(['h1', 'h2']);
      expect(JSON.parse(backing.json)[ATTR_META]).toEqual({ keys: [], tags: ['t'] });

      yield* store.update([{ ...object, heads: undefined }]);
      expect(yield* store.queryBackings([object.recordId!])).toEqual([]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'stores the document bytes a host passes with heads, and drops them with the heads',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const object: IndexerObject = {
        spaceId: SpaceId.random(),
        queueId: null,
        queueNamespace: null,
        documentId: 'doc-1',
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'alpha' },
        heads: ['h1'],
        bytes: new Uint8Array([1, 2, 3]),
      };
      yield* metaIndex.update([object]);
      yield* metaIndex.lookupRecordIds([object]);
      yield* store.update([object]);
      const [backing] = yield* store.queryBackings([object.recordId!]);
      expect(backing.bytes).toEqual(new Uint8Array([1, 2, 3]));

      yield* store.update([{ ...object, bytes: undefined }]);
      const [withoutBytes] = yield* store.queryBackings([object.recordId!]);
      expect(withoutBytes.heads).toEqual(['h1']);
      expect(withoutBytes.bytes).toBeUndefined();

      yield* store.update([{ ...object, heads: undefined }]);
      expect(yield* store.queryBackings([object.recordId!])).toEqual([]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'handles more than 999 recordIds without exceeding SQLite variable limit',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const spaceId = SpaceId.random();
      const count = 1100;
      const objects: IndexerObject[] = Array.from({ length: count }, (_, i) => ({
        spaceId,
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, index: i },
      }));

      yield* metaIndex.update(objects);
      yield* metaIndex.lookupRecordIds(objects);
      yield* store.update(objects);

      const recordIds = objects.map((o) => o.recordId!);
      const snapshots = yield* store.querySnapshotsJSON(recordIds);

      expect(snapshots).toHaveLength(count);
      const returnedIds = new Set(snapshots.map((s) => s.recordId));
      for (const id of recordIds) {
        expect(returnedIds.has(id)).toBe(true);
      }
    }, Effect.provide(TestLayer)),
  );
});
