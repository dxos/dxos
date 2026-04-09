import { Prompt } from '@dxos/blueprints';
import { Effect, Exit } from 'effect';
import { TestContext } from '@effect/vitest';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Operation } from '@dxos/operation';
import { AgentHandlers, AgentPrompt } from '@dxos/assistant-toolkit';
import { Database, Ref, Obj } from '@dxos/echo';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: [AgentHandlers],
});

export const DEFAULT_TEST_TIMEOUT = 120_000;

interface AgentTestOptions {
  expect?: 'success' | 'failure';
  prompt: Prompt.Prompt;
}

export const agentTest = (options: AgentTestOptions): ((ctx: TestContext) => Effect.Effect<void, any>) => {
  return Effect.fnUntraced(
    function* (_) {
      yield* Database.add(options.prompt);
      yield* Database.flush();
      const exit = yield* Operation.invoke(AgentPrompt, {
        prompt: Ref.make(options.prompt),
        input: {},
      }).pipe(Effect.exit);

      if (options.expect === 'failure') {
        if (!Exit.isFailure(exit)) {
          throw new Error('Expected the agent to fail, but it succeeded');
        }
      } else {
        yield* exit;
      }
    },
    Effect.provide(TestLayer),
    withStaticSeed,
    TestHelpers.provideTestContext,
  );
};

const withStaticSeed: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> = (_) =>
  Effect.zipRight(
    Effect.sync(() => Obj.ID.dangerouslyDisableRandomness()),
    _,
  );
