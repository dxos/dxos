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

describe('Web', () => {
  it.effect(
    // TODO(dmaretskyi): Agent unable to activate blueprints.
    'search the web',
    agentTest(
      { plugins: [AssistantTestFixturePlugin()] },
      Prompt.make({
        instructions: trim`
          Search 5 richest people in the world and create Person objects in the database.

          Completion criteria:
          - 5 Person objects in the database.
          - Web search works.
        `,
        blueprints: [Ref.make(BlueprintManagerBlueprint.make()), Ref.make(DatabaseBlueprint.make())],
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
