//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { DatabaseSkill } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

// TODO(wittjosiah): Migrate to an eval (see .agents/skills/agent-eval-tests). createEvalRunner has
// no `inferenceProvider` option yet (always AiServiceTestingPreset('direct')) — would need one
// added, mirroring harness.ts's AgentTestOptions.inferenceProvider, to select 'ollama' here.
describe('Local AI', () => {
  it.effect(
    'create and query database objects',
    agentTest({
      model: DXN.make('com.openai.model.gpt-oss-20b.default'),
      inferenceProvider: 'ollama',
      disableLlmMemoization: true,
      instructions: trim`
        Create a new organization called "Cyberdyne Systems".
        Query the database to confirm that the organization is created and the query tool is working.
      `,
      skills: [Ref.make(DatabaseSkill.make())],
    }),
    {
      timeout: agentTestTimeout({ disableLlmMemoization: true }),
      tags: ['manual'],
    },
  );
});
