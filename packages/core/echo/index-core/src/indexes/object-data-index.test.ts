//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import type { Obj } from '@dxos/echo';
import { ATTR_DELETED, ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { EntityMetaIndex } from './entity-meta-index.ts';
import type { IndexerObject } from './interface.ts';
import { ObjectDataIndex } from './object-data-index.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');

const TestLayer = SqliteClient.layer({
  filename: ':memory:',
}).pipe(Layer.provideMerge(Reactivity.layer));

/** The body store keys on `objectMeta.recordId`, so the meta index is migrated alongside. */
const setup = Effect.gen(function* () {
  const metaIndex = new EntityMetaIndex();
  yield* metaIndex.migrate();
  const index = new ObjectDataIndex();
  yield* index.migrate();
  return { metaIndex, index };
});

/** Assigns record ids before writing bodies, as `IndexEngine.#update` does. */
const assignRecordIds = (metaIndex: EntityMetaIndex, objects: IndexerObject[]) =>
  Effect.gen(function* () {
    yield* metaIndex.update(objects);
    yield* metaIndex.lookupRecordIds(objects);
  });

const recordIdOf = (object: IndexerObject): number => {
  invariant(object.recordId !== null, 'recordId not assigned');
  return object.recordId;
};

const makeQueueObject = (spaceId: SpaceId, data: Obj.JSON): IndexerObject => ({
  spaceId,
  queueId: EntityId.random(),
  queueNamespace: 'data',
  documentId: null,
  recordId: null,
  createdAt: null,
  updatedAt: Date.now(),
  data,
});

const makeDocumentObject = (spaceId: SpaceId, documentId: string, data: Obj.JSON): IndexerObject => ({
  spaceId,
  queueId: null,
  queueNamespace: null,
  documentId,
  recordId: null,
  createdAt: null,
  updatedAt: Date.now(),
  data,
});

describe('ObjectDataIndex', () => {
  describe('queryBodies', () => {
    it.effect(
      'returns bodies for all present recordIds',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const spaceId = SpaceId.random();
        const objects: IndexerObject[] = [
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'alpha' }),
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'beta' }),
        ];

        yield* assignRecordIds(metaIndex, objects);
        yield* index.update(objects);

        const bodies = yield* index.queryBodies(objects.map(recordIdOf));

        expect(bodies).toHaveLength(2);
        const byRecordId = new Map(bodies.map((body) => [body.recordId, body.snapshot]));
        expect(byRecordId.get(recordIdOf(objects[0]))?.value).toBe('alpha');
        expect(byRecordId.get(recordIdOf(objects[1]))?.value).toBe('beta');
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'omits recordIds without a body',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const object = makeQueueObject(SpaceId.random(), {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          value: 'present',
        });
        yield* assignRecordIds(metaIndex, [object]);
        yield* index.update([object]);

        const staleId = 99999;
        const bodies = yield* index.queryBodies([recordIdOf(object), staleId]);

        expect(bodies).toHaveLength(1);
        expect(bodies[0].recordId).toBe(recordIdOf(object));
        expect(bodies[0].snapshot.value).toBe('present');
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'handles more than 999 recordIds without exceeding the SQLite variable limit',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const spaceId = SpaceId.random();
        const count = 1100;
        const objects: IndexerObject[] = Array.from({ length: count }, (_, position) =>
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, index: position }),
        );

        yield* assignRecordIds(metaIndex, objects);
        yield* index.update(objects);

        const recordIds = objects.map(recordIdOf);
        const bodies = yield* index.queryBodies(recordIds);

        expect(bodies).toHaveLength(count);
        const returnedIds = new Set(bodies.map((body) => body.recordId));
        for (const recordId of recordIds) {
          expect(returnedIds.has(recordId)).toBe(true);
        }
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'returns nothing for an empty id list',
      Effect.fnUntraced(function* () {
        const { index } = yield* setup;
        expect(yield* index.queryBodies([])).toEqual([]);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('update', () => {
    it.effect(
      'merges a partial block onto the prior body',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const spaceId = SpaceId.random();
        const queueId = EntityId.random();
        const objectId = EntityId.random();
        const full: IndexerObject = {
          ...makeQueueObject(spaceId, { id: objectId, [ATTR_TYPE]: TYPE_PERSON, name: 'Alice', age: 30 }),
          queueId,
        };
        yield* assignRecordIds(metaIndex, [full]);
        yield* index.update([full]);

        // The `Feed.remove` tombstone: same object, no `@type`, no body.
        const tombstone: IndexerObject = {
          ...makeQueueObject(spaceId, { id: objectId, [ATTR_DELETED]: true }),
          queueId,
        };
        yield* assignRecordIds(metaIndex, [tombstone]);
        expect(recordIdOf(tombstone)).toBe(recordIdOf(full));
        yield* index.update([tombstone]);

        const [body] = yield* index.queryBodies([recordIdOf(full)]);
        expect(body.snapshot).toEqual({
          id: objectId,
          [ATTR_TYPE]: TYPE_PERSON,
          name: 'Alice',
          age: 30,
          [ATTR_DELETED]: true,
        });
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'stores a partial block as-is when there is no prior body',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const objectId = EntityId.random();
        const tombstone = makeQueueObject(SpaceId.random(), { id: objectId, [ATTR_DELETED]: true });
        yield* assignRecordIds(metaIndex, [tombstone]);
        yield* index.update([tombstone]);

        const [body] = yield* index.queryBodies([recordIdOf(tombstone)]);
        expect(body.snapshot).toEqual({ id: objectId, [ATTR_DELETED]: true });
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'replaces the body wholesale for a full block',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const spaceId = SpaceId.random();
        const queueId = EntityId.random();
        const objectId = EntityId.random();
        const first: IndexerObject = {
          ...makeQueueObject(spaceId, { id: objectId, [ATTR_TYPE]: TYPE_PERSON, name: 'Alice', age: 30 }),
          queueId,
        };
        yield* assignRecordIds(metaIndex, [first]);
        yield* index.update([first]);

        const second: IndexerObject = {
          ...makeQueueObject(spaceId, { id: objectId, [ATTR_TYPE]: TYPE_PERSON, name: 'Alicia' }),
          queueId,
        };
        yield* assignRecordIds(metaIndex, [second]);
        expect(recordIdOf(second)).toBe(recordIdOf(first));
        yield* index.update([second]);

        const bodies = yield* index.queryBodies([recordIdOf(first)]);
        expect(bodies).toHaveLength(1);
        expect(bodies[0].snapshot).toEqual({ id: objectId, [ATTR_TYPE]: TYPE_PERSON, name: 'Alicia' });
        expect('age' in bodies[0].snapshot).toBe(false);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'retains @meta in the body of a document object',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const meta = { keys: [{ source: 'example.com', id: 'k1' }], convergenceKey: 'ck-1' };
        // A document object: the one case the full-text snapshot strips `@meta` from.
        const object = makeDocumentObject(SpaceId.random(), 'doc-1', {
          id: EntityId.random(),
          [ATTR_TYPE]: TYPE_PERSON,
          [ATTR_META]: meta,
          name: 'Alice',
        });
        yield* assignRecordIds(metaIndex, [object]);
        yield* index.update([object]);

        const [body] = yield* index.queryBodies([recordIdOf(object)]);
        expect(body.snapshot[ATTR_META]).toEqual(meta);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('countMissingBodies', () => {
    it.effect(
      'counts objectMeta rows without a body and reaches zero after update',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;

        const spaceId = SpaceId.random();
        const objects: IndexerObject[] = [
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON }),
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON }),
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON }),
        ];

        expect(yield* index.countMissingBodies()).toBe(0);

        yield* assignRecordIds(metaIndex, objects);
        expect(yield* index.countMissingBodies()).toBe(3);

        yield* index.update(objects.slice(0, 1));
        expect(yield* index.countMissingBodies()).toBe(2);

        yield* index.update(objects.slice(1));
        expect(yield* index.countMissingBodies()).toBe(0);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('deleteByRecordIds', () => {
    it.effect(
      'removes the bodies of the given records only',
      Effect.fnUntraced(function* () {
        const { metaIndex, index } = yield* setup;
        const sql = yield* SqlClient.SqlClient;

        const spaceId = SpaceId.random();
        const objects: IndexerObject[] = [
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'keep' }),
          makeQueueObject(spaceId, { id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON, value: 'drop' }),
        ];
        yield* assignRecordIds(metaIndex, objects);
        yield* index.update(objects);

        yield* index.deleteByRecordIds([recordIdOf(objects[1])]);

        const bodies = yield* index.queryBodies(objects.map(recordIdOf));
        expect(bodies.map((body) => body.recordId)).toEqual([recordIdOf(objects[0])]);
        const [{ count }] = yield* sql<{ count: number }>`SELECT count(*) AS count FROM objectData`;
        expect(count).toBe(1);
      }, Effect.provide(TestLayer)),
    );
  });
});
