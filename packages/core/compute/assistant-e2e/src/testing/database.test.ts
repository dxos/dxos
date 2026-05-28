//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Routine } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, DEFAULT_TEST_TIMEOUT, getDefaultBlueprints } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// Quarantined: stale memoized conversation after the Mailbox `labels` → `tags` schema rename
// (PR #11576). Regenerate the fixture via `ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test`
// and remove `.skip` once the conversation is refreshed.
describe.skip('Database', () => {
  it.effect(
    'create and query',
    agentTest(
      Routine.make({
        instructions: trim`
          Create a new organization called "Cyberdyne Systems".
          Query the database to confirm that the organization is created and the query tool is working.
        `,
        blueprints: getDefaultBlueprints(),
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
