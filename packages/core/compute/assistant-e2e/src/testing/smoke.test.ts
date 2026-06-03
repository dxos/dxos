//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest({
      instructions: trim`
        Do nothing and succeed.
      `,
    }),
    { timeout: agentTestTimeout() },
  );

  it.effect(
    'fails',
    agentTest({
      expect: 'failure',
      instructions: trim`
        Do nothing and fail.
      `,
    }),
    { timeout: agentTestTimeout() },
  );
});
