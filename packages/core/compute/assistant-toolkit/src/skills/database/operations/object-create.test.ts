//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Query, Tag, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { ObjectCreate } from './definitions';
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

describe('ObjectCreate', () => {
  it.effect(
    'object-create: creates an object with the declared properties',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Organization.Organization),
          properties: { name: 'Cyberdyne Systems' },
        });

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(1);
        expect(organizations[0].name).toBe('Cyberdyne Systems');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: resolves an encoded reference into a live ref',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Person.Person),
          properties: {
            fullName: 'John Doe',
            // The model emits references in this wire form; the handler decodes it to a ref.
            organization: EncodedReference.fromURI(Obj.getURI(organization)),
          },
        });

        const people = yield* Database.query(Query.type(Person.Person)).run;
        expect(people).toHaveLength(1);
        expect(people[0].organization?.target).toBe(organization);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
