//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import { TestContainer, TestObject, decodeNamed, makeTestLayer } from './testing';
import UpdateObjectHandler from './update-object';

const TestLayer = makeTestLayer(UpdateObjectHandler);

describe('SpaceOperation.UpdateObject', () => {
  it.effect(
    'patches scalar properties',
    Effect.fnUntraced(
      function* ({ expect }) {
        const object = yield* Database.add(Obj.make(TestObject, { name: 'before' }));

        const result = yield* Operation.invoke(SpaceOperation.UpdateObject, {
          object: Ref.make(object),
          properties: { name: 'after' },
        });

        expect(decodeNamed(result.object).name).toBe('after');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'writes a reference array supplied as wire-form envelopes',
    Effect.fnUntraced(
      function* ({ expect }) {
        const first = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        const second = yield* Database.add(Obj.make(TestObject, { name: 'second' }));
        const container = yield* Database.add(
          Obj.make(TestContainer, { name: 'held', items: [Ref.make(first), Ref.make(second)] }),
        );

        yield* Operation.invoke(SpaceOperation.UpdateObject, {
          object: Ref.make(container),
          properties: { items: [{ '/': Obj.getURI(first) }] },
        });

        const remaining = yield* Effect.forEach(container.items, (ref) => Database.load(ref));
        expect(remaining.map((item) => decodeNamed(item).name)).toEqual(['first']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
