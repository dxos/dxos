//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, DEFAULT_TEST_TIMEOUT } from '../harness';
import { AssistantTestFixturePlugin } from './fixture-plugin';

Obj.ID.dangerouslyDisableRandomness();

describe('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest(
      { plugins: [AssistantTestFixturePlugin()] },
      Prompt.make({
        instructions: trim`
          Do nothing and succeed.
        `,
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );

  it.effect(
    'fails',
    agentTest(
      {
        expect: 'failure',
        plugins: [AssistantTestFixturePlugin()],
      },
      Prompt.make({
        instructions: trim`
          Do nothing and fail.
        `,
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
