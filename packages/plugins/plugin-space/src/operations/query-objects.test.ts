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
        // A text query reads the full-text index, which lags the indexing pass until a flush drains it.
        yield* Database.flush({ secondaryIndexes: true });

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
        // A text query reads the full-text index, which lags the indexing pass until a flush drains it.
        yield* Database.flush({ secondaryIndexes: true });

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

  it.effect(
    'a result capped by the limit reports itself as truncated',
    Effect.fnUntraced(
      function* ({ expect }) {
        // More objects than the handler's default limit, so a truncating default is visible.
        const count = 24;
        for (let index = 0; index < count; index++) {
          yield* Database.add(Obj.make(TestObject, { name: `unfiltered-${index}` }));
        }
        yield* Database.flush();

        // A capped page must say so, or the caller reads it as the whole space.
        const { results, truncated } = yield* Operation.invoke(SpaceOperation.QueryObjects, {});
        expect(results).toHaveLength(10);
        expect(truncated).toBe(true);

        // An explicit limit bounds the result and reports the same way.
        const { results: bounded, truncated: boundedTruncated } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          limit: 5,
        });
        expect(bounded).toHaveLength(5);
        expect(boundedTruncated).toBe(true);

        // A limit the result fits inside is not a truncation, and must not over-fetch.
        const { results: whole, truncated: wholeTruncated } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          typename: Type.getTypename(TestObject),
          limit: count + 1,
        });
        expect(whole).toHaveLength(count);
        expect(wholeTruncated).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a multi-word text search narrows rather than widens',
    Effect.fnUntraced(
      function* ({ expect }) {
        // `fullText` splits the phrase and combines the terms with `Query.all`, whose JSDoc here
        // promises "Every term must match, so the words of a phrase narrow the result rather than
        // widening it". `Query.all` builds a `{ type: 'union' }` node, so the terms are OR-ed: the
        // more words a caller types, the more unrelated objects come back.
        const both = yield* Database.add(Obj.make(TestObject, { name: 'alphaterm betaterm' }));
        yield* Database.add(Obj.make(TestObject, { name: 'alphaterm only' }));
        yield* Database.add(Obj.make(TestObject, { name: 'betaterm only' }));
        // A text query reads the full-text index, which lags the indexing pass until a flush drains it.
        yield* Database.flush({ secondaryIndexes: true });

        const { results } = yield* Operation.invoke(SpaceOperation.QueryObjects, {
          text: 'alphaterm betaterm',
          limit: 200,
        });

        expect(results.map(labelOf)).toEqual([Obj.getLabel(both)]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an unknown input property is rejected rather than silently dropped',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Database.add(Obj.make(TestObject, { name: 'searchable-token' }));
        yield* Database.add(Obj.make(TestObject, { name: 'unrelated' }));
        yield* Database.flush();

        // The published input schema sets `additionalProperties: false`, and a caller that
        // misspells `text` — say as `query`, which is what the tool's own description calls it —
        // must be told. Today the field is dropped, `text` and `typename` are both undefined, and
        // the handler's `Match.orElse` falls through to `Query.select(Filter.everything())`: the
        // search silently becomes "list everything" and is returned as a success, which a caller
        // cannot distinguish from a real result set.
        const outcome = yield* Effect.exit(
          Operation.invoke(SpaceOperation.QueryObjects, { query: 'searchable-token', limit: 200 } as any),
        );

        expect(outcome._tag, 'an unknown input property must not be accepted').toEqual('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
