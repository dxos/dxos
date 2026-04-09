//
// Copyright 2026 DXOS.org
//

import { Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';
import { describe, it } from '@effect/vitest';
import { agentTest, DEFAULT_TEST_TIMEOUT, getDefaultBlueprints } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Database', () => {
  it.effect(
    'create and query',
    agentTest(
      Prompt.make({
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
