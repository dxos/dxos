//
// Copyright 2026 DXOS.org
//

import {
  AgentHandlers,
  AgentPrompt,
  AutomationBlueprint,
  BlueprintManagerBlueprint,
  BlueprintManagerHandlers,
  DatabaseBlueprint,
  DatabaseHandlers,
  MemoryBlueprint,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Operation } from '@dxos/operation';
import { InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';
import { TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

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
  If available tools prevented you from completing the task fully, report the failure.
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
      const [options = {}, prompt] = args.length === 1 ? [undefined, args[0]] : args;

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
