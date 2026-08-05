//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

// Frozen-conversation replay (A/B); off by default (`DX_RUN_MODEL_FIXTURE_TESTS=1` / `DX_UPDATE_MODEL_FIXTURES=1`
// to run) — see `packages/core/compute/ai/TESTING.md`.
describe('Smoke', { tags: ['model-fixture'] }, () => {
  it.effect(
    'succeeds',
    agentTest({
      model: DXN.make('com.anthropic.model.claude-sonnet-4-6.default'),
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
      model: DXN.make('com.anthropic.model.claude-sonnet-4-6.default'),
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
