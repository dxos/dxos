//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

describe('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest({
      blueprints: [],
      instructions: trim`
        Do nothing and succeed.
      `,
    }),
    { timeout: agentTestTimeout() },
  );

  it.effect(
    'fails',
    agentTest({
      blueprints: [],
      expect: 'failure',
      instructions: trim`
        Do nothing and fail.
      `,
    }),
    { timeout: agentTestTimeout() },
  );
});
