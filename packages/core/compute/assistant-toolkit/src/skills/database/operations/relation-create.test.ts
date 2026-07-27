//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { RelationCreate } from './definitions';
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

describe('RelationCreate', () => {
  it.effect(
    'relation-create: links source to target and stores the properties',
    Effect.fnUntraced(
      function* ({ expect }) {
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(RelationCreate, {
          typename: Type.getTypename(Employer.Employer),
          source: Ref.make(person),
          target: Ref.make(organization),
          properties: { role: 'Engineer' },
        });

        const relations = yield* Database.query(Query.type(Employer.Employer)).run;
        expect(relations).toHaveLength(1);
        expect(relations[0].role).toBe('Engineer');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
