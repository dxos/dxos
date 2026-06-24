//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Web', () => {
  it.effect(
    'search the web',
    agentTest({
      instructions: trim`
        Run a web search for the capital of France. I'm testing that the tool works, call "web-search" only.
      `,
      completionCriteria: ['The capital of France is returned.', 'The web-search tool was the only tool used.'],
      // TODO(dmaretskyi): Update to use skill keys and get skills from registry.
      skills: [Ref.make(WebSearchSkill.make())],
    }),
    { timeout: agentTestTimeout() },
  );
});
