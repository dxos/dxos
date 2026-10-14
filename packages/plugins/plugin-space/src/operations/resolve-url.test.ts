//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { SpaceOperation } from '#types';

import { SpaceOperationError } from './errors.ts';
import GetObjectsHandler from './get-objects.ts';
import ResolveUrlHandler from './resolve-url.ts';
import { TestObject, decodeNamed, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(ResolveUrlHandler, GetObjectsHandler);

describe('SpaceOperation.ResolveUrl', () => {
  it.effect(
    'resolves a link to references that read back the objects it shows',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const first = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        const second = yield* Database.add(Obj.make(TestObject, { name: 'second' }));
        yield* Database.flush();

        const { spaceId, objects } = yield* Operation.invoke(SpaceOperation.ResolveUrl, {
          url: `https://composer.space/w/${db.spaceId}/doc/${first.id}/db/testObject+${second.id}/comments`,
        });
        expect(spaceId).toBe(db.spaceId);
        expect(objects.map(({ key }) => key)).toEqual(['doc', 'db']);

        // Bound to the db as the wire's decode does: in process the output refs carry no resolver.
        const read = yield* Operation.invoke(SpaceOperation.GetObjects, {
          objects: objects.map(({ object }) => db.makeRef<Obj.Unknown>(object.uri)),
        });
        expect(read.objects.map((object) => decodeNamed(object).name)).toEqual(['first', 'second']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'resolves a feed-resident object, as a message link names it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const feed = yield* Database.add(Feed.make());
        const message = Obj.make(TestObject, { name: 'in a feed' });
        yield* Feed.append(feed, [message]);
        yield* Database.flush();

        const { objects } = yield* Operation.invoke(SpaceOperation.ResolveUrl, {
          url: `/w/${db.spaceId}/message/${feed.id}+${message.id}`,
        });
        const read = yield* Operation.invoke(SpaceOperation.GetObjects, {
          objects: objects.map(({ object }) => db.makeRef<Obj.Unknown>(object.uri)),
        });
        expect(read.objects.map((object) => decodeNamed(object).name)).toEqual(['in a feed']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'accepts a deep link',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const object = yield* Database.add(Obj.make(TestObject, { name: 'linked' }));

        const { objects } = yield* Operation.invoke(SpaceOperation.ResolveUrl, {
          url: `composer://w/${db.spaceId}/doc/${object.id}`,
        });
        expect(objects.map(({ object }) => object.uri)).toEqual([Obj.getURI(object)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'fails on a link that is not a Composer URL, but not on a workspace without objects',
    Effect.fnUntraced(
      function* ({ expect }) {
        // The invoker carries a handler's failure as a defect, so it is read off the cause.
        const exit = yield* Operation.invoke(SpaceOperation.ResolveUrl, { url: 'https://github.com/dxos/dxos' }).pipe(
          Effect.exit,
        );
        const failure = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
        expect(failure).toBeInstanceOf(SpaceOperationError);
        expect(failure).toHaveProperty('message', expect.stringMatching(/^Not a Composer URL/));

        const settings = yield* Operation.invoke(SpaceOperation.ResolveUrl, {
          url: `/w/dxos:settings/doc/${EntityId.random()}`,
        });
        expect(settings).toEqual({ objects: [] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
