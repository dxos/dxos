//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { SpaceId } from '@dxos/keys';

import { DeviceAnnotationStore } from './device-annotation-store.ts';

const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));

describe('DeviceAnnotationStore', () => {
  const setup = Effect.gen(function* () {
    const store = new DeviceAnnotationStore(yield* SqlClient.SqlClient);
    yield* store.migrate();
    return store;
  });

  it.effect(
    'upserts, deletes, and reads by document and object',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      yield* store.write([
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'org.example.one', value: '1' },
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'org.example.two', value: '"x"' },
        { spaceId, documentId: 'doc-2', objectId: 'b', key: 'org.example.one', value: 'true' },
      ]);
      yield* store.write([
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'org.example.one', value: '2' },
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'org.example.two' },
      ]);

      expect(yield* store.queryByDocuments(spaceId, ['doc-1'])).toEqual([
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'org.example.one', value: '2' },
      ]);
      expect((yield* store.queryByObjects(spaceId, ['b'])).map(({ value }) => value)).toEqual(['true']);
      expect(yield* store.queryByObjects(SpaceId.random(), ['b'])).toEqual([]);
      expect(yield* store.queryByDocuments(SpaceId.random(), ['doc-1'])).toEqual([]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'a write moves the value to the document it names',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      yield* store.write([{ spaceId, documentId: 'doc-1', objectId: 'a', key: 'k.k.k', value: '1' }]);
      yield* store.write([{ spaceId, documentId: 'doc-2', objectId: 'a', key: 'k.k.k', value: '1' }]);
      expect(yield* store.queryByDocuments(spaceId, ['doc-1'])).toEqual([]);
      expect(yield* store.queryByDocuments(spaceId, ['doc-2'])).toHaveLength(1);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'garbage collection drops values of removed documents and objects',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      yield* store.write([
        { spaceId, documentId: 'doc-1', objectId: 'a', key: 'k.k.k', value: '1' },
        { spaceId, documentId: 'doc-2', objectId: 'b', key: 'k.k.k', value: '1' },
        { spaceId, documentId: 'doc-2', objectId: 'c', key: 'k.k.k', value: '1' },
      ]);
      yield* store.deleteObjects({ spaceId, documentIds: ['doc-1'], objects: [{ objectId: 'b' }] });
      expect((yield* store.queryByDocuments(spaceId, ['doc-1', 'doc-2'])).map(({ objectId }) => objectId)).toEqual([
        'c',
      ]);
    }, Effect.provide(TestLayer)),
  );
});
