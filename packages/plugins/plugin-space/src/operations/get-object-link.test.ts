//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import { makeCreateObjectUrl } from '../capabilities/helpers.ts';
import GetObjectLinkHandler from './get-object-link.ts';
import GetObjectsHandler from './get-objects.ts';
import ResolveUrlHandler from './resolve-url.ts';
import { TEST_ORIGIN, TestObject, decodeNamed, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(GetObjectLinkHandler, ResolveUrlHandler, GetObjectsHandler);

describe('SpaceOperation.GetObjectLink', () => {
  it.effect(
    'links an object that resolveUrl reads back',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const object = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        yield* Database.flush();

        const { url } = yield* Operation.invoke(SpaceOperation.GetObjectLink, { object: Ref.make(object) });
        expect(new URL(url).origin).toBe(TEST_ORIGIN);

        const { spaceId, objects } = yield* Operation.invoke(SpaceOperation.ResolveUrl, { url });
        expect(spaceId).toBe(db.spaceId);
        const read = yield* Operation.invoke(SpaceOperation.GetObjects, {
          objects: objects.map(({ object }) => db.makeRef<Obj.Unknown>(object.uri)),
        });
        expect(read.objects.map((object) => decodeNamed(object).name)).toEqual(['first']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it('has no link builder on a host without a public origin', ({ expect }) => {
    expect(makeCreateObjectUrl({})).toBeUndefined();
  });
});
