//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { SandboxPlugin } from '@dxos/plugin-sandbox/plugin';
import { Sandbox } from '@dxos/plugin-sandbox/types';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

/**
 * Prereq: local EDGE at http://localhost:8787 with the sandbox service enabled.
 * Regenerate memoized conversations with:
 *   ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test -- src/testing/sandbox.test.ts
 */
describe('Sandbox', { tags: ['functions-e2e'] }, () => {
  it.effect(
    'creates a sandbox and runs a shell command',
    agentTest({
      edge: 'local',
      plugins: [SandboxPlugin()],
      clientTypes: [Sandbox.Sandbox],
      instructions: trim`
        The database starts empty. The sandbox service is available at http://localhost:8787.

        Enable the sandbox blueprint (key: org.dxos.blueprint.sandbox) using the blueprint manager.

        Use CreateSandbox (org.dxos.function.sandbox.create) to create a sandbox named "assistant-e2e-test".

        Use Exec (org.dxos.function.sandbox.exec) on that sandbox to run: echo hello world

        Report the exec result in your completion output.
      `,
      completionCriteria: [
        'The sandbox blueprint (org.dxos.blueprint.sandbox) is enabled.',
        'A Sandbox object exists in the database.',
        'CreateSandbox completes successfully.',
        'Exec completes with exit code 0 and stdout containing "hello world".',
      ],
    }),
    { timeout: agentTestTimeout() },
  );
});
