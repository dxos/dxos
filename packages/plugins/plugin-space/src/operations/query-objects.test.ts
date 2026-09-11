//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddTypeHandler from './add-type.ts';
import QueryObjectsHandler from './query-objects.ts';
import { TestObject, labelOf, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(QueryObjectsHandler, AddTypeHandler);

describe('SpaceOperation.QueryObjects', () => {
  it.effect(
    'a typename-only query returns every object of the type at any limit',
    Effect.fnUntraced(
      function* ({ expect }) {
        const count = 5;
        for (let index = 0; index < count; index++) {
          yield* Database.add(Obj.make(TestObject, { name: `typed-${index}` }));
        }
        yield* Database.flush();

        // A limit above the result count must not truncate, and must not vary run to run.
        for (const limit of [3, count, count + 1, 200]) {
          const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
            typename: Type.getTypename(TestObject),
            limit,
          });
          expect(results).toHaveLength(Math.min(limit, count));
        }

        // `includeContent` changes the shape of a row, never which rows match.
        const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          typename: Type.getTypename(TestObject),
          includeContent: true,
          limit: 200,
        });
        expect(results).toHaveLength(count);

        // A second registration of the same typename persisted in the space. Resolving the typename
        // to one registration and filtering on that pinned the query to whichever copy the registry
        // returned first, so the objects — written under the static declaration — stopped matching.
        yield* Operation.invoke(SpaceOperation.AddType, {
          typename: Type.getTypename(TestObject),
          name: 'Test Object',
          jsonSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: 'Test Object',
            properties: { name: { type: 'string' } },
          },
        });

        const { results: afterShadow } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          typename: Type.getTypename(TestObject),
          limit: 200,
        });
        expect(afterShadow).toHaveLength(count);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'finds feed content only with includeQueues',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Feed.append(feed, [
          Obj.make(TestObject, { name: 'Lot Booking Co', description: 'search-token-7f3a2c91' }),
        ]);
        yield* Database.flush();

        // Feed-backed content lives behind a feed ref, so a plain space query cannot see it.
        const { results: spaceOnly } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          text: 'search-token-7f3a2c91',
          limit: 20,
        });
        expect(spaceOnly).toHaveLength(0);

        const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          text: 'search-token-7f3a2c91',
          includeQueues: true,
          limit: 20,
        });
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.some((row) => labelOf(row).includes('Lot Booking'))).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    '`in` scopes results to the named feed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const inbox = yield* Database.add(Feed.make({ name: 'inbox-1' }));
        yield* Feed.append(inbox, [Obj.make(TestObject, { name: 'Alpha', description: 'in-param-token' })]);
        const archive = yield* Database.add(Feed.make({ name: 'inbox-2' }));
        yield* Feed.append(archive, [Obj.make(TestObject, { name: 'Beta', description: 'in-param-token' })]);
        yield* Database.flush();

        const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          in: [Ref.make(inbox)],
          text: 'in-param-token',
          includeQueues: true,
          limit: 20,
        });

        const labels = results.map(labelOf);
        expect(labels.some((label) => label.includes('Alpha'))).toBe(true);
        expect(labels.some((label) => label.includes('Beta'))).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
