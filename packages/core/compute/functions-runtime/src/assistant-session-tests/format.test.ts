//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { createSystemPrompt, formatSystemPrompt } from '@dxos/assistant';
import { Skill, Template, Operation, OperationHandlerSet } from '@dxos/compute';
import { Database, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { AssistantTestLayer } from '../testing';

const OrganizationList = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.organizationList'),
    name: 'Organization List',
    description: 'List organizations',
  },
  input: Schema.Struct({}),
  output: Schema.Array(Schema.String),
  services: [Database.Service],
});

const Handlers = OperationHandlerSet.make(
  Operation.withHandler(
    OrganizationList,
    Effect.fnUntraced(function* () {
      const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
      return organizations.map((organization) => organization.name ?? '<no org>');
    }),
  ),
);

const TestLayer = AssistantTestLayer({
  types: [Text.Text, Organization.Organization, Skill.Skill],
  operationHandlers: Handlers,
});

describe('format', () => {
  it.effect(
    'should format',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const object = db.add(
          Obj.make(Organization.Organization, {
            name: 'Test',
            website: 'https://www.test.com',
          }),
        );

        const skill = db.add(
          Skill.make({
            key: 'com.example.skill.test',
            name: 'Test',
            instructions: Template.make({
              source: trim`
                Test
                This is the test skill.
              `,
            }),
          }),
        );

        const output = yield* formatSystemPrompt({
          system: createSystemPrompt({}),
          skills: [skill],
          objects: [object],
        });

        console.log(output);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'should format with function input',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const object = db.add(
          Obj.make(Organization.Organization, {
            name: 'Test Org',
            website: 'https://www.test.com',
          }),
        );

        const skill = db.add(
          Skill.make({
            key: 'com.example.skill.test',
            name: 'Test',
            instructions: Template.make({
              source: trim`
                Organization List:
                {{#each organizations}}
                  - {{this}}
                {{/each}}
              `,
              inputs: [
                {
                  name: 'organizations',
                  kind: 'operation',
                  operation: OrganizationList.meta.key,
                },
              ],
            }),
          }),
        );

        const output = yield* formatSystemPrompt({
          system: createSystemPrompt({}),
          skills: [skill],
          objects: [object],
        });

        expect(output).to.include('Test Org');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
