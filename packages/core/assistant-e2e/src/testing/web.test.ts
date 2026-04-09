import { Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';
import { describe, it } from '@effect/vitest';
import { agentTest, DEFAULT_TEST_TIMEOUT, getDefaultBlueprints } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Web', () => {
  it.effect.skip(
    // TODO(dmaretskyi): Agent unable to activate blueprints.
    'search the web',
    agentTest(
      Prompt.make({
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
