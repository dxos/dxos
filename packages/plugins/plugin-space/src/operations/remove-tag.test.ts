//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddTagHandler from './add-tag.ts';
import RemoveTagHandler from './remove-tag.ts';
import { TestObject, makeTestLayer, taggedIds } from './testing.ts';

const TestLayer = makeTestLayer(AddTagHandler, RemoveTagHandler);

describe('SpaceOperation.RemoveTag', () => {
  it.effect(
    'untags an object it was tagged with',
    Effect.fnUntraced(
      function* ({ expect }) {
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        const object = yield* Database.add(Obj.make(TestObject, { name: 'tagged' }));
        yield* Database.flush();
        yield* Operation.invoke(SpaceOperation.AddTag, { tag: Ref.make(tag), object: Ref.make(object) });

        yield* Operation.invoke(SpaceOperation.RemoveTag, { tag: Ref.make(tag), object: Ref.make(object) });

        expect(taggedIds(object)).not.toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
