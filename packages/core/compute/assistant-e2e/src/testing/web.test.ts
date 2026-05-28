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
describe.skip('Web', () => {
  it.effect(
    // TODO(dmaretskyi): Agent unable to activate blueprints.
    'search the web',
    agentTest(
      Routine.make({
        instructions: trim`
          Search 5 richest people in the world and create Person objects in the database.

          Completion criteria:
          - 5 Person objects in the database.
          - Web search works.
        `,
        blueprints: getDefaultBlueprints(),
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
