//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { ObjectUpdate } from './definitions';
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

describe('ObjectUpdate', () => {
  it.effect(
    'object-update: writes the given properties onto the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Before' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectUpdate, {
          obj: Ref.make(organization),
          properties: { name: 'After', description: 'Now with a description.' },
        });

        expect(organization.name).toBe('After');
        expect(organization.description).toBe('Now with a description.');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
