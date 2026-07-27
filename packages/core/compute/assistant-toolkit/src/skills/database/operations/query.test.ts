//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { Query as QueryOperation } from './definitions';
import { DatabaseHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [
    Organization.Organization,
    Person.Person,
    Employer.Employer,
    Tag.Tag,
    Skill.Skill,
    Feed.Feed,
    AiContext.Binding,
  ],
  skills: [DatabaseSkill.make()],
  disableLlmMemoization: true,
});

describe('Query', () => {
  it.effect(
    'query: finds objects by typename',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          limit: 20,
        });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ label: Schema.String })))(results);
        expect(rows.map((row) => row.label).sort()).toEqual(['Acme Corp', 'Globex Industries']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: the in param scopes results to the given feed',
    Effect.fnUntraced(
      function* ({ expect }) {
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

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ label: Schema.String })))(results);
        expect(rows.map((row) => row.label)).toEqual(['Email Corp Alpha']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query operation: includeQueues via invokeFunction',
    Effect.fnUntraced(
      function* ({ expect }) {
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
        type QueryRow = { typename?: string; label?: string };
        expect(withQueues.length).toBeGreaterThanOrEqual(1);
        expect(
          (withQueues as QueryRow[]).some(
            (row) => row.typename === 'org.dxos.type.organization' && String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);

        const byTypename = yield* Operation.invoke(QueryOperation, {
          typename: 'org.dxos.type.organization',
          includeQueues: true,
          limit: 20,
        });
        expect(byTypename.length).toBeGreaterThanOrEqual(1);
        expect(
          (byTypename as QueryRow[]).some(
            (row) => row.typename === 'org.dxos.type.organization' && String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
