//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import GetObjectsHandler from './get-objects.ts';
import { TestObject, decodeNamed, makeTestLayer } from './testing.ts';

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

  it.effect(
    'snapshots a tagged object with its tags as references',
    Effect.fnUntraced(
      function* ({ expect }) {
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        const object = yield* Database.add(Obj.make(TestObject, { name: 'tagged' }));
        Obj.update(object, (object) => {
          Obj.getMeta(object).tags.push(tag);
        });
        yield* Database.flush();

        const { objects } = yield* Operation.invoke(SpaceOperation.GetObjects, { objects: [Ref.make(object)] });

        const [read] = objects;
        // The snapshot MCP and EDGE return; a tag ref is space-local, qualified by the transport.
        expect(Entity.isEntity(read) ? Entity.toJSON(read)['@meta']?.tags : undefined).toEqual([
          { '/': `echo:///${tag.id}` },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
