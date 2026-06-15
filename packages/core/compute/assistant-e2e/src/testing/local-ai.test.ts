//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { DatabaseBlueprint } from '@dxos/assistant-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Local AI', () => {
  it.effect(
    'create and query database objects',
    agentTest({
      model: 'ai.ollama.model.gpt-oss:20b',
      inferenceProvider: 'ollama',
      disableLlmMemoization: true,
      instructions: trim`
        Create a new organization called "Cyberdyne Systems".
        Query the database to confirm that the organization is created and the query tool is working.
      `,
      blueprints: [Ref.make(DatabaseBlueprint.make())],
    }),
    { timeout: agentTestTimeout({ disableLlmMemoization: true }), tags: ['llm'] },
  );
});
