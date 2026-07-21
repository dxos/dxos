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

describeMemoized('Planning', () => {
  it.effect(
    'create three haiku tasks and complete each one',
    agentTest({
      sessionChat: true,
      instructions: trim`
        Enable the planning skill (key: org.dxos.skill.planning) using the skill manager.

        Create exactly 3 plan tasks with update-tasks for writing a short haiku (3 lines) on these topics:
        1. spring rain
        2. ocean waves
        3. night stars

        Work through the tasks one at a time:
        - Mark only the current task in-progress.
        - Write the haiku for that topic in your response (visible in the chat feed).
        - Mark that task done with update-tasks before starting the next task.

        When all three haikus are written and all tasks are done, call completeJob.
      `,
      completionCriteria: [
        'Planning skill is enabled successfully.',
        'Exactly 3 tasks exist in the plan for the three haiku topics.',
        'All 3 tasks are marked done.',
        'A 3-line haiku was written for each topic (spring rain, ocean waves, night stars).',
        'Agent used "update-tasks" tool and did not manipulate the objects directly.',
      ],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
