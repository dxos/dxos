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
describe.skipIf(!runMemoizedTests())('Database', () => {
  it.effect(
    'create and query',
    agentTest({
      instructions: trim`
        Create a new organization called "Cyberdyne Systems".
        Query the database to confirm that the organization is created and the query tool is working.
      `,
    }),
    {
      timeout: agentTestTimeout(),
    },
  );

  it.effect(
    'create Person',
    agentTest({
      instructions: trim`
        Create a new person object for Bernie Sanders".
      `,
      completionCriteria: ['Person object created with correct data.'],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
