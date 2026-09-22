//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol/types';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Database, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddObjectHandler from './add-object.ts';
import AddTypeHandler from './add-type.ts';
import { TestCollectionItem, TestObject, decodeNamed, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(AddObjectHandler, AddTypeHandler);

describe('SpaceOperation.AddObject', () => {
  it.effect(
    'files a live object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: Obj.make(TestObject, { name: 'held' }),
        });
        expect(decodeNamed(object).name).toBe('held');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'instantiates a draft against a registered type, keeping every field',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.testObject', 'name': 'drafted', 'description': 'kept' },
        });
        expect(decodeNamed(object).name).toBe('drafted');
        expect((object as { description?: string }).description).toBe('kept');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a drafted collection item is persisted when the root collection is minted for it',
    Effect.fnUntraced(
      function* ({ expect }) {
        // A space carrying `SpaceProperties` but no root collection yet — the shape a bare
        // `client.spaces.create()` leaves behind, and the branch where `CollectionModel.add`
        // mints a fresh root collection to file into.
        yield* Database.add(Obj.make(SpaceProperties, {}));

        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.testCollectionItem', 'name': 'filed' },
        });

        // The ref the collection now holds has to resolve, so the object must be in the database —
        // a returned id says nothing about that.
        expect(Obj.getDatabase(object as Obj.Any)).toBeDefined();
        const found = yield* Database.query(Query.select(Filter.type(TestCollectionItem))).run;
        expect(found.map((entity) => decodeNamed(entity).name)).toContain('filed');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a target collection outside the invocation space is refused, not filed across databases',
    Effect.fnUntraced(
      function* ({ expect }) {
        // A collection that is not in the invocation's database — detached here, the same shape a
        // collection from another space presents. Filing into it would persist the object in one
        // place and push its reference somewhere else.
        const foreign = Collection.make({ objects: [] });
        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, {
            object: { '@type': 'com.example.type.testCollectionItem', 'name': 'stray' },
            target: foreign,
          }),
        );
        expect(exit._tag).toBe('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an unknown typename fails with the name, not a defect',
    Effect.fnUntraced(
      function* ({ expect }) {
        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, { object: { '@type': 'com.example.type.missing' } }),
        );
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Schema not found: com.example.type.missing');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a draft violating its schema fails with the validation message, not a defect',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.strict',
          name: 'Strict',
          jsonSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: 'Strict',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        });

        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, { object: { '@type': 'com.example.type.strict' } }),
        );
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Invalid draft for com.example.type.strict');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
