//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { SandboxPlugin } from '@dxos/plugin-sandbox/plugin';
import { Sandbox } from '@dxos/plugin-sandbox/types';
import { trim } from '@dxos/util';

import { DEFAULT_TEST_TIMEOUT, agentTest, agentTestTimeout } from '../harness';

/**
 * Prereq: sandbox-service worker at http://localhost:8792 (API at /api/sandbox).
 * Entity IDs must be unique per run (do not call `Obj.ID.dangerouslyDisableRandomness`) so sandbox-service
 * KV does not reject the same sandboxId under a new space from a prior run.
 * Regenerate memoized conversations with:
 *   ALLOW_LLM_GENERATION=1 VITEST_TAGS_FILTER='manual' moon run assistant-e2e:test -- src/testing/sandbox.test.ts
 */
// TODO(wittjosiah): Migrate to an eval (see .agents/skills/agent-eval-tests). createEvalRunner has
// no `randomEntityIds`, `sandbox`, or `clientTypes` options yet — all three would need adding,
// mirroring harness.ts's AgentTestOptions, plus a live sandbox-service worker to run against.
describe('Sandbox', { tags: ['manual'] }, () => {
  it.effect(
    'creates a sandbox and runs a shell command',
    agentTest({
      randomEntityIds: true,
      sandbox: 'local',
      plugins: [SandboxPlugin()],
      clientTypes: [Sandbox.Sandbox],
      instructions: trim`
        The database starts empty. The sandbox service is available at http://localhost:8792.
        Enable the sandbox skill (key: org.dxos.skill.sandbox) using the skill manager.
        Use CreateSandbox (org.dxos.function.sandbox.create) to create a sandbox named "assistant-e2e-test".
        Use Exec (org.dxos.function.sandbox.exec) on that sandbox to run: echo hello world
        Report the exec result in your completion output.
      `,
      completionCriteria: [
        'The sandbox skill (org.dxos.skill.sandbox) is enabled.',
        'A Sandbox object exists in the database.',
        'CreateSandbox completes successfully.',
        'Exec completes with exit code 0 and stdout containing "hello world".',
      ],
    }),
    {
      timeout: agentTestTimeout() ?? DEFAULT_TEST_TIMEOUT,
    },
  );

  it.effect(
    'github',
    agentTest({
      randomEntityIds: true,
      sandbox: 'local',
      plugins: [SandboxPlugin()],
      clientTypes: [Sandbox.Sandbox],
      instructions: trim`
        Query contributors to the dxos/dxos repository using CLI in the sandbox.
      `,
      completionCriteria: [
        'Agent did use the gh CLI.',
        'Contributors include at least: wittjosiah, richburdon, dmaretskyi, mykola-vrmchk',
      ],
    }),
    {
      timeout: agentTestTimeout() ?? DEFAULT_TEST_TIMEOUT,
    },
  );
});
