//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddObjectHandler from './add-object';
import AddTypeHandler from './add-type';
import { TestObject, decodeNamed, makeTestLayer } from './testing';

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
