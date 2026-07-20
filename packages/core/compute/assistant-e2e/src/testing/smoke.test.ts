//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { ScriptedAiService } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

describe('Smoke', () => {
  it.effect(
    'succeeds',
    agentTest({
      skills: [],
      instructions: trim`
        Do nothing and succeed.
      `,
      script: [
        ScriptedAiService.toolCall('completeJob', { success: { completedCriteria: {} } }),
        ScriptedAiService.text('I did nothing as instructed and completed the job successfully.'),
      ],
    }),
  );

  it.effect(
    'fails',
    agentTest({
      skills: [],
      expect: 'failure',
      instructions: trim`
        Do nothing and fail.
      `,
      script: [
        ScriptedAiService.toolCall('completeJob', {
          failure: {
            message: 'Task instructed to do nothing and fail.',
            description: 'As per the instructions, no work was performed and the job was deliberately failed.',
          },
        }),
        ScriptedAiService.text('The task has been completed as instructed — I did nothing and reported a failure.'),
      ],
    }),
  );
});
