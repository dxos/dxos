//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Routine } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, DEFAULT_TEST_TIMEOUT } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest(
      Routine.make({
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
      },
      Routine.make({
        instructions: trim`
          Do nothing and fail.
        `,
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
