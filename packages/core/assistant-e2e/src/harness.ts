import { Blueprint, Prompt } from '@dxos/blueprints';
import { Effect, Exit } from 'effect';
import { TestContext } from '@effect/vitest';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Operation } from '@dxos/operation';
import {
  AgentHandlers,
  AgentPrompt,
  BlueprintManagerBlueprint,
  DatabaseBlueprint,
  DatabaseHandlers,
  WebSearchBlueprint,
  BlueprintManagerHandlers,
  MemoryBlueprint,
  AutomationBlueprint,
} from '@dxos/assistant-toolkit';
import { AssistantBlueprint } from '@dxos/plugin-assistant/blueprints';
import { InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { Database, Ref, Obj, Tag, Feed } from '@dxos/echo';
import { Organization } from '@dxos/types';
import { Person } from '@dxos/types';
import { Employer } from '@dxos/types';
import { trim } from '@dxos/util';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: [AgentHandlers, DatabaseHandlers, BlueprintManagerHandlers],
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Blueprint.Blueprint, Feed.Feed],
  blueprints: [
    BlueprintManagerBlueprint.make(),
    DatabaseBlueprint.make(),
    WebSearchBlueprint.make(),
    MemoryBlueprint.make(),
    AutomationBlueprint.make(),
    // AssistantBlueprint.make(),
    InboxBlueprint.make(),
  ],
});

export const DEFAULT_TEST_TIMEOUT = 120_000;

export const getDefaultBlueprints = () => [
  // Ref.make(AssistantBlueprint.make()),
  Ref.make(BlueprintManagerBlueprint.make()),
  Ref.make(DatabaseBlueprint.make()),
];

const INSTRUCTIONS = trim`
  You are running within a test environment.
  The prompt is the specification for the test.
  Perform the instructions precisely and do not deviate.
  Do not fake any work if the provided tools don't work.
  The goal is to test the system, so be honest about the results.
  If avilable tools prevented you from completing the task fully, report the failure.
  Do not fall back on your own knowledge, only use the tools provided.
`;

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
        systemInstructions: INSTRUCTIONS,
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
