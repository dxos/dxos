//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { BlueprintManagerBlueprint, DatabaseBlueprint } from '@dxos/assistant-toolkit';
import { Prompt } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, DEFAULT_TEST_TIMEOUT } from '../harness';
import { AssistantTestFixturePlugin } from './fixture-plugin';

Obj.ID.dangerouslyDisableRandomness();

describe('Database', () => {
  it.effect(
    'create and query',
    agentTest(
      { plugins: [AssistantTestFixturePlugin()] },
      Prompt.make({
        instructions: trim`
          Create a new organization called "Cyberdyne Systems".
          Query the database to confirm that the organization is created and the query tool is working.
        `,
        blueprints: [Ref.make(BlueprintManagerBlueprint.make()), Ref.make(DatabaseBlueprint.make())],
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
