//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { Query as QueryOperation } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('Query', () => {
  it.effect(
    'query: finds objects by typename',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          limit: 20,
        });

        expect((yield* rows(results)).map((row) => row.label).sort()).toEqual(['Acme Corp', 'Globex Industries']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: the in param scopes results to the given feed',
    Effect.fnUntraced(
      function* (_) {
        const inbox1 = Feed.make({ name: 'inbox-1' });
        yield* Database.add(inbox1);
        yield* Feed.append(inbox1, [Obj.make(Organization.Organization, { name: 'Email Corp Alpha' })]);

        const inbox2 = Feed.make({ name: 'inbox-2' });
        yield* Database.add(inbox2);
        yield* Feed.append(inbox2, [Obj.make(Organization.Organization, { name: 'Email Corp Beta' })]);
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          in: [Ref.make(inbox1)],
          includeQueues: true,
          limit: 20,
        });

        expect((yield* rows(results)).map((row) => row.label)).toEqual(['Email Corp Alpha']);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query operation: includeQueues via invokeFunction',
    Effect.fnUntraced(
      function* (_) {
        const feed = Feed.make();
        yield* Database.add(feed);
        yield* Feed.append(feed, [
          Obj.make(Organization.Organization, {
            name: 'Invoke Op Lot Co',
            description: 'Feed-only mock email op-search-token-7f3a2c91 reservation line.',
          }),
        ]);
        yield* Database.flush();

        const noQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: false,
          limit: 20,
        });
        expect(noQueues).toHaveLength(0);

        const withQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: true,
          limit: 20,
        });
        expect(withQueues.length).toBeGreaterThanOrEqual(1);
        expect(
          (yield* rows(withQueues)).some(
            (row) =>
              row.typename === Type.getTypename(Organization.Organization) &&
              String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);

        const byTypename = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          includeQueues: true,
          limit: 20,
        });
        expect(byTypename.length).toBeGreaterThanOrEqual(1);
        expect(
          (yield* rows(byTypename)).some(
            (row) =>
              row.typename === Type.getTypename(Organization.Organization) &&
              String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// The operation's output is `Schema.Unknown`; decode rather than cast.
const rows = (results: readonly unknown[]) =>
  Schema.decodeUnknown(
    Schema.Array(Schema.Struct({ typename: Schema.optional(Schema.String), label: Schema.optional(Schema.String) })),
  )(results);
