//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';

import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import * as Jsonb from '@dxos/util/Jsonb';

import { MIGRATIONS_TABLE } from '../migrations/object-snapshot/index.ts';
import { TestSqliteLayer as TestLayer } from '../testing/index.ts';
import { EntityMetaIndex } from './entity-meta-index.ts';
import type { IndexerObject } from './interface.ts';
import { ObjectSnapshotIndex, decodeSnapshot } from './object-snapshot-index.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');

const migrated = Effect.fnUntraced(function* () {
  const store = new ObjectSnapshotIndex(yield* SqlClient.SqlClient);
  yield* store.migrate();
  return { store };
});

describe('ObjectSnapshotIndex', () => {
  it.effect(
    'stores snapshots as JSONB, which SQL reads as JSON and the readers decode',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const sql = yield* SqlClient.SqlClient;
      const metaIndex = new EntityMetaIndex(sql);
      yield* metaIndex.migrate();

      const data = {
        id: EntityId.random(),
        [ATTR_TYPE]: TYPE_PERSON,
        value: 'ремонт 設計 🚀',
        nested: { list: [1, 'two'] },
      };
      const object: IndexerObject = {
        spaceId: SpaceId.random(),
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data,
      };
      yield* metaIndex.update([object]);
      yield* metaIndex.lookupRecordIds([object]);
      yield* store.update([object]);

      const [row] = yield* sql<{ type: string; value: string; text: string }>`
        SELECT typeof(snapshot) AS type, snapshot ->> '$.value' AS value, json(snapshot) AS text FROM objectSnapshot`;
      expect(row.type).toBe('blob');
      expect(row.value).toBe(data.value);
      expect(JSON.parse(row.text)).toEqual(data);
      invariant(object.recordId !== null);
      const [snapshot] = yield* store.querySnapshotsJSON([object.recordId]);
      expect(snapshot.snapshot).toEqual(data);
      const [stored] = yield* store.querySnapshotsJSONB([object.recordId, -1]);
      expect(stored.recordId).toBe(object.recordId);
      expect(Jsonb.decode(stored.jsonb)).toEqual(data);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'merges a partial block onto the prior snapshot as an object spread would',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const sql = yield* SqlClient.SqlClient;
      const metaIndex = new EntityMetaIndex(sql);
      yield* metaIndex.migrate();

      const id = EntityId.random();
      const base = { spaceId: SpaceId.random(), queueId: EntityId.random(), queueNamespace: 'data', documentId: null };
      const full: IndexerObject = {
        ...base,
        recordId: null,
        createdAt: null,
        updatedAt: 1,
        data: { id, [ATTR_TYPE]: TYPE_PERSON, body: { x: 1, y: 2 }, kept: 'k', dropped: 1 },
      };
      yield* metaIndex.update([full]);
      yield* metaIndex.lookupRecordIds([full]);
      invariant(full.recordId !== null);
      yield* store.update([full]);

      // Enough keys to span several merge statements, a nested value that must replace rather than deep-merge,
      // an explicit null that must stay, a dropped value that must remove, and a key that needs quoting in a path.
      const many = Object.fromEntries(Array.from({ length: 45 }, (_, index) => [`k${index}`, index]));
      const patch = {
        id,
        '@deleted': true,
        'body': { z: 3 },
        'nothing': null,
        'dropped': undefined,
        'we"ird\\key': 'q',
        ...many,
      };
      yield* store.update([{ ...full, updatedAt: 2, data: patch }]);

      const [stored] = yield* store.querySnapshotsJSON([full.recordId]);
      expect(stored.snapshot).toEqual(JSON.parse(JSON.stringify({ ...full.data, ...patch })));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'stores a partial block as is when there is no prior snapshot',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const object: IndexerObject = {
        spaceId: SpaceId.random(),
        queueId: EntityId.random(),
        queueNamespace: 'data',
        documentId: null,
        recordId: null,
        createdAt: null,
        updatedAt: 1,
        data: { 'id': EntityId.random(), '@deleted': true },
      };
      yield* metaIndex.update([object]);
      yield* metaIndex.lookupRecordIds([object]);
      invariant(object.recordId !== null);
      yield* store.update([object]);

      const [stored] = yield* store.querySnapshotsJSON([object.recordId]);
      expect(stored.snapshot).toEqual(object.data);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'converts snapshots stored as JSON text when migrating to JSONB',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const sql = yield* SqlClient.SqlClient;
      const data = { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'legacy' };
      // A row as the text-era writer left it, with the conversion not yet recorded as applied.
      yield* sql`INSERT INTO objectSnapshot (recordId, snapshot) VALUES (1, ${JSON.stringify(data)})`;
      yield* sql`DELETE FROM ${sql(MIGRATIONS_TABLE)} WHERE name = 'snapshot_jsonb'`;

      yield* store.migrate();

      const [row] = yield* sql<{ type: string }>`SELECT typeof(snapshot) AS type FROM objectSnapshot`;
      expect(row.type).toBe('blob');
      const [snapshot] = yield* store.querySnapshotsJSON([1]);
      expect(snapshot.snapshot).toEqual(data);
    }, Effect.provide(TestLayer)),
  );

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
      expect(decodeSnapshot(backing.jsonb)[ATTR_META]).toEqual({ keys: [], tags: ['t'] });

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
      const { recordId } = object;
      invariant(recordId !== null);
      yield* store.update([object]);
      const [backing] = yield* store.queryBackings([recordId]);
      expect(backing.bytes).toEqual(new Uint8Array([1, 2, 3]));

      yield* store.update([{ ...object, bytes: undefined }]);
      const [withoutBytes] = yield* store.queryBackings([recordId]);
      expect(withoutBytes.heads).toEqual(['h1']);
      expect(withoutBytes.bytes).toBeUndefined();

      yield* store.update([{ ...object, heads: undefined }]);
      expect(yield* store.queryBackings([recordId])).toEqual([]);
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

  it.effect(
    'counts missing snapshots only in the requested spaces and sources',
    Effect.fnUntraced(function* () {
      const { store } = yield* migrated();
      const metaIndex = new EntityMetaIndex(yield* SqlClient.SqlClient);
      yield* metaIndex.migrate();

      const [spaceA, spaceB] = [SpaceId.random(), SpaceId.random()];
      const make = (spaceId: SpaceId, source: 'document' | 'feed'): IndexerObject => ({
        spaceId,
        queueId: source === 'feed' ? EntityId.random() : null,
        queueNamespace: source === 'feed' ? 'trace' : null,
        documentId: source === 'document' ? EntityId.random() : null,
        recordId: null,
        createdAt: null,
        updatedAt: Date.now(),
        data: { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON },
      });
      const indexed = [make(spaceA, 'document'), make(spaceB, 'feed')];
      const orphan = make(spaceA, 'feed');
      yield* metaIndex.update([...indexed, orphan]);
      yield* metaIndex.lookupRecordIds(indexed);
      yield* store.update(indexed);

      expect(yield* store.countMissingSnapshots()).toBe(1);
      expect(yield* store.countMissingSnapshots({ spaceIds: [spaceA] })).toBe(1);
      expect(yield* store.countMissingSnapshots({ spaceIds: [spaceB] })).toBe(0);
      expect(yield* store.countMissingSnapshots({ spaceIds: [spaceA], feeds: false })).toBe(0);
    }, Effect.provide(TestLayer)),
  );
});
