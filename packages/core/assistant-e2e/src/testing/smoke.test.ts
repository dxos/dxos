import { describe, it } from '@effect/vitest';
import { agentTest, DEFAULT_TEST_TIMEOUT } from '../harness';
import { Prompt } from '@dxos/blueprints';
import { trim } from '@dxos/util';
import { Obj } from '@dxos/echo';

Obj.ID.dangerouslyDisableRandomness();

describe('smoke', () => {
  it.effect(
    'succeeds',
    agentTest({
      prompt: Prompt.make({
        instructions: trim`
          Do nothing and succeed.
        `,
      }),
    }),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );

  it.effect(
    'fails',
    agentTest({
      expect: 'failure',
      prompt: Prompt.make({
        instructions: trim`
          Do nothing and fail.
        `,
      }),
    }),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
