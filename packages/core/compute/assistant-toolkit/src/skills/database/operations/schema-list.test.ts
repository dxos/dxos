//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Feed, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import { SchemaList } from './definitions';
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

describe('SchemaList', () => {
  it.effect(
    'schema-list: lists registered types and omits the excluded ones',
    Effect.fnUntraced(
      function* ({ expect }) {
        const schemas = yield* Operation.invoke(SchemaList, {});

        const rows = yield* Schema.decodeUnknown(
          Schema.Array(Schema.Struct({ typename: Schema.String, kind: Schema.String })),
        )(schemas);
        const typenames = rows.map((row) => row.typename);
        expect(typenames).toContain(Type.getTypename(Organization.Organization));
        expect(typenames).toContain(Type.getTypename(Person.Person));
        // Skill and Feed are on the handler's exclusion list, which keeps them out of the agent's context.
        expect(typenames).not.toContain(Type.getTypename(Skill.Skill));
        expect(typenames).not.toContain(Type.getTypename(Feed.Feed));
        expect(rows.find((row) => row.typename === Type.getTypename(Employer.Employer))?.kind).toBe('relation');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
