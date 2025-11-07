//
// Copyright 2025 DXOS.org
//

import { beforeAll, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blueprint, Template } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { createSystemPrompt } from '../templates/system';

import { formatSystemPrompt } from './format';

describe('format', () => {
  let db: EchoDatabase;
  beforeAll(async () => {
    const builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Text.Text, Organization.Organization, Blueprint.Blueprint],
    }));
  });

  it.effect(
    'should format',
    Effect.fn(function* () {
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
    }),
  );
});
