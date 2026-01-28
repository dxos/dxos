//
// Copyright 2025 DXOS.org
//

import { beforeAll, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { createSystemPrompt } from '../templates/system';

import { formatSystemPrompt } from './format';
import { AssistantTestLayer } from '../testing';
import { TestHelpers } from '@dxos/effect/testing';

const TestLayer = AssistantTestLayer({
  types: [Text.Text, Organization.Organization, Blueprint.Blueprint],
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
          blueprints: [blueprint, blueprint],
          objects: [object, object],
        });

        console.log(output);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
