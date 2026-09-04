//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import QueryObjectsHandler from './query-objects';
import { TestObject, labelOf, makeTestLayer } from './testing';

const TestLayer = makeTestLayer(QueryObjectsHandler);

describe('SpaceOperation.QueryObjects', () => {
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
