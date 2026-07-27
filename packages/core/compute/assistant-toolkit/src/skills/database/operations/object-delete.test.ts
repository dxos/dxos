//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Query, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { ObjectDelete } from './definitions';
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

describe('ObjectDelete', () => {
  it.effect(
    'object-delete: removes the object from the database',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Doomed Corp' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectDelete, { obj: Ref.make(organization) });
        yield* Database.flush();

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
