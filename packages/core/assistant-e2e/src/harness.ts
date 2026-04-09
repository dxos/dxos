import { Blueprint, Prompt } from '@dxos/blueprints';
import { Effect, Exit } from 'effect';
import { TestContext } from '@effect/vitest';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Operation } from '@dxos/operation';
import { AgentHandlers, AgentPrompt, DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { Database, Ref, Obj, Tag, Feed } from '@dxos/echo';
import { Organization } from '@dxos/types';
import { Person } from '@dxos/types';
import { Employer } from '@dxos/types';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: [AgentHandlers, DatabaseHandlers],
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Blueprint.Blueprint, Feed.Feed],
  blueprints: [DatabaseBlueprint.make()],
});

export const DEFAULT_TEST_TIMEOUT = 120_000;

interface AgentTestOptions {
  expect?: 'success' | 'failure';
}

export const agentTest: {
  (options: AgentTestOptions, prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
  (prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
} = (...args: [AgentTestOptions, Prompt.Prompt] | [Prompt.Prompt]) => {
  return Effect.fnUntraced(
    function* (_) {
      const [options = {}, prompt] = args.length === 1 ? [, args[0]] : args;

      yield* Database.add(prompt);
      yield* Database.flush();
      const exit = yield* Operation.invoke(AgentPrompt, {
        prompt: Ref.make(prompt),
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
