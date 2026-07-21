//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { runMemoizedTests } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

// Frozen-conversation replay (A/B); off by default (`DX_RUN_LLM_TESTS=1` / `ALLOW_LLM_GENERATION=1`
// to run) — see `packages/core/compute/ai/TESTING.md`.
const describeMemoized = runMemoizedTests() ? describe : describe.skip;

describeMemoized('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest({
      skills: [],
      instructions: trim`
        Do nothing and succeed.
      `,
    }),
    {
      timeout: agentTestTimeout(),
    },
  );

  it.effect(
    'fails',
    agentTest({
      skills: [],
      expect: 'failure',
      instructions: trim`
        Do nothing and fail.
      `,
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
