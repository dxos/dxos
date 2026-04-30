//
// Copyright 2026 DXOS.org
//

import { TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';

import { ModelName } from '@dxos/ai';
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
  WebSearchHandlers,
  WebSearchToolkitOpaque,
} from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint, Routine } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers, type TestTag } from '@dxos/effect/testing';
import { Operation } from '@dxos/operation';
import { InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { InboxOperationHandlerSet } from '@dxos/plugin-inbox/operations';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

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

  model?: ModelName;

  /**
   * @default 'edge-remote'
   */
  inferenceProvider?: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';

  disableLlmMemoization?: boolean;

  testTag?: TestTag;
}

export const agentTest: {
  (options: AgentTestOptions, prompt: Routine.Routine): (ctx: TestContext) => Effect.Effect<void, any>;
  (prompt: Routine.Routine): (ctx: TestContext) => Effect.Effect<void, any>;
} = (...args: [AgentTestOptions, Routine.Routine] | [Routine.Routine]) => {
  const [options = {}, prompt] = args.length === 1 ? [undefined, args[0]] : args;

  const model =
    options.model ?? (options.inferenceProvider === 'ollama' ? 'gpt-oss:20b' : '@anthropic/claude-opus-4-6');

  const TestLayer = AssistantTestLayer({
    aiServicePreset: options.inferenceProvider ?? 'edge-remote',
    model,
    disableLlmMemoization: options.disableLlmMemoization ?? false,
    operationHandlers: [
      AgentHandlers,
      DatabaseHandlers,
      BlueprintManagerHandlers,
      InboxOperationHandlerSet,
      WebSearchHandlers,
    ],
    types: [
      Organization.Organization,
      Person.Person,
      Employer.Employer,
      Tag.Tag,
      Blueprint.Blueprint,
      Feed.Feed,
      Mailbox.Mailbox,
    ],
    blueprints: [
      BlueprintManagerBlueprint.make(),
      DatabaseBlueprint.make(),
      WebSearchBlueprint.make(),
      MemoryBlueprint.make(),
      AutomationBlueprint.make(),
      // AssistantBlueprint.make(),
      InboxBlueprint.make(),
    ],
    toolkits: [WebSearchToolkitOpaque],
  });

  return Effect.fnUntraced(
    function* (_) {
      yield* Database.add(prompt);
      const conversationFeed = Feed.make();
      yield* Database.add(conversationFeed);
      yield* Database.flush();
      const exit = yield* Operation.invoke(
        AgentPrompt,
        {
          prompt: Ref.make(prompt),
          input: {},
          systemInstructions: INSTRUCTIONS,
          model,
        },
        { conversation: Obj.getDXN(conversationFeed).toString() },
      ).pipe(Effect.exit);

      if (options.expect === 'failure') {
        if (!Exit.isFailure(exit)) {
          throw new Error('Expected the agent to fail, but it succeeded');
        }
      } else {
        yield* exit;
      }
    },
    Effect.provide(TestLayer),
    TestHelpers.provideTestContext,
    options.testTag ? TestHelpers.taggedTest(options.testTag) : Function.identity,
  );
};
