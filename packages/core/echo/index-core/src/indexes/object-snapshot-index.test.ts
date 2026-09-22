//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { EntityMetaIndex } from './entity-meta-index.ts';
import type { IndexerObject } from './interface.ts';
import { ObjectSnapshotIndex } from './object-snapshot-index.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
}).pipe(Layer.provideMerge(Reactivity.layer));

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
