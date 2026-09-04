//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import GetObjectsHandler from './get-objects';
import { TestObject, decodeNamed, makeTestLayer } from './testing';

const TestLayer = makeTestLayer(GetObjectsHandler);

describe('SpaceOperation.GetObjects', () => {
  it.effect(
    'reads every reference in one call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const first = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        const second = yield* Database.add(Obj.make(TestObject, { name: 'second' }));
        yield* Database.flush();

        const { objects } = yield* Operation.invoke(SpaceOperation.GetObjects, {
          objects: [Ref.make(first), Ref.make(second)],
        });

        expect(objects).toHaveLength(2);
        expect(objects.map((object) => decodeNamed(object).name)).toEqual(['first', 'second']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
