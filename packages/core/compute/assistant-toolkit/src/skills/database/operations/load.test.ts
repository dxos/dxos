//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { Load } from './definitions';
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

describe('Load', () => {
  it.effect(
    'load: returns one entry per requested ref',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const loaded = yield* Operation.invoke(Load, { refs: [Ref.make(organization), Ref.make(person)] });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ id: Schema.String })))(loaded);
        expect(rows.map((row) => row.id)).toEqual([organization.id, person.id]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
