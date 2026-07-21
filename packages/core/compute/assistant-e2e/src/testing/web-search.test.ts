//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { runMemoizedTests } from '@dxos/ai/testing';
import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// Frozen-conversation replay (A/B); off by default (`DX_RUN_LLM_TESTS=1` / `ALLOW_LLM_GENERATION=1`
// to run) — see `packages/core/compute/ai/TESTING.md`.
const describeMemoized = runMemoizedTests() ? describe : describe.skip;

describeMemoized('Web', () => {
  it.effect(
    'search the web',
    agentTest({
      instructions: trim`
        Run a web search for the capital of France. 
        I'm testing that the tool works, call "web-search" only.
      `,
      completionCriteria: ['The capital of France is returned.', 'The web-search tool was the only tool used.'],
      // TODO(dmaretskyi): Update to use skill keys and get skills from registry.
      skills: [Ref.make(WebSearchSkill.make())],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
