//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { defineFunction } from '@dxos/functions';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { createSystemPrompt } from '../templates/system';
import { AssistantTestLayer } from '../testing';

import { formatSystemPrompt } from './format';

const organizationListFunction = defineFunction({
  key: 'dxos.org/function/organization-list',
  name: 'Organization List',
  description: 'List organizations',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Array(Schema.String),
  handler: Effect.fnUntraced(function* () {
    const organizations = yield* Database.runQuery(Query.type(Organization.Organization));
    return organizations.map((organization) => organization.name);
  }),
});

const TestLayer = AssistantTestLayer({
  types: [Text.Text, Organization.Organization, Blueprint.Blueprint],
  functions: [organizationListFunction],
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

        const blueprint = db.add(
          Blueprint.make({
            key: 'example.com/blueprint/test',
            name: 'Test',
            instructions: Template.make({
              source: trim`
                Test
                This is the test blueprint.
              `,
            }),
          }),
        );

        const output = yield* formatSystemPrompt({
          system: createSystemPrompt({}),
          blueprints: [blueprint],
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

        const blueprint = db.add(
          Blueprint.make({
            key: 'example.com/blueprint/test',
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
                  kind: 'function',
                  function: organizationListFunction.key,
                },
              ],
            }),
          }),
        );

        const output = yield* formatSystemPrompt({
          system: createSystemPrompt({}),
          blueprints: [blueprint],
          objects: [object],
        });

        expect(output).to.include('Test Org');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
