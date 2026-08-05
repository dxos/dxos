//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// Frozen-conversation replay (A/B); off by default (`DX_RUN_MODEL_FIXTURE_TESTS=1` / `DX_UPDATE_MODEL_FIXTURES=1`
// to run) — see `packages/core/compute/ai/TESTING.md`.
describe('Web', { tags: ['model-fixture'] }, () => {
  it.effect(
    'search the web',
    agentTest({
      model: DXN.make('com.anthropic.model.claude-sonnet-4-6.default'),
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
