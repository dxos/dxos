import { describe, it } from '@effect/vitest';
import { agentTest, DEFAULT_TEST_TIMEOUT } from '../harness';
import { Prompt } from '@dxos/blueprints';
import { trim } from '@dxos/util';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseBlueprint } from '@dxos/assistant-toolkit';

Obj.ID.dangerouslyDisableRandomness();

describe('Database', () => {
  it.effect(
    'create and query',
    agentTest(
      Prompt.make({
        instructions: trim`
          Create a new organization called "Cyberdyne Systems".
          Query the database to confirm that the organization is create and query tool is working.
        `,
        blueprints: [Ref.make(DatabaseBlueprint.make())],
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
