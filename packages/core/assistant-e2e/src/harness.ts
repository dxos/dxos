//
// Copyright 2026 DXOS.org
//

import { TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';

import { ModelName } from '@dxos/ai';
import { ActivationEvents, Capabilities, type Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
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
import { type Blueprint, Prompt } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref, type Type } from '@dxos/echo';
import { TestHelpers, type TestTag } from '@dxos/effect/testing';
import { Operation, type OperationHandlerSet } from '@dxos/operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { trim } from '@dxos/util';

export const DEFAULT_TEST_TIMEOUT = 120_000;

/**
 * Built-in blueprints shipped by `@dxos/assistant-toolkit` that are not
 * contributed via composer plugins. Always included in the test layer.
 */
const DEFAULT_TOOLKIT_BLUEPRINTS = (): Blueprint.Blueprint[] => [
  BlueprintManagerBlueprint.make(),
  DatabaseBlueprint.make(),
  WebSearchBlueprint.make(),
  MemoryBlueprint.make(),
  AutomationBlueprint.make(),
];

const DEFAULT_TOOLKIT_HANDLERS: OperationHandlerSet.OperationHandlerSet[] = [
  AgentHandlers,
  DatabaseHandlers,
  BlueprintManagerHandlers,
  WebSearchHandlers,
];

/**
 * Blueprints that prompts can reference via `blueprints` without loading any plugin.
 * These mirror {@link DEFAULT_TOOLKIT_BLUEPRINTS} but wrapped as refs for `Prompt.make`.
 */
export const getDefaultBlueprints = () => [
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

export interface AgentTestOptions {
  expect?: 'success' | 'failure';

  model?: ModelName;

  /**
   * @default 'edge-remote'
   */
  inferenceProvider?: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';

  /**
   * If true, the agent hits the real LLM directly; otherwise conversations are memoized
   * to a JSON file next to the test. Defaults to `false`, which together with
   * `ALLOW_LLM_GENERATION=1` controls whether new conversations may be recorded.
   */
  disableLlmMemoization?: boolean;

  testTag?: TestTag;

  /**
   * Real composer plugins to load into the test harness. Blueprints, schemas and
   * operation handlers contributed by these plugins are harvested and wired into
   * the agent's runtime — no need to re-import them by hand.
   */
  plugins?: Plugin.Plugin[];

  /**
   * Extra blueprints to register in addition to the toolkit defaults and any
   * contributed by plugins.
   */
  extraBlueprints?: Blueprint.Blueprint[];

  /**
   * Extra ECHO types to register in addition to any contributed by plugins.
   */
  extraTypes?: Type.AnyEntity[];

  /**
   * Extra operation handler sets to register in addition to the toolkit defaults
   * and any contributed by plugins.
   */
  extraOperationHandlers?: OperationHandlerSet.OperationHandlerSet[];
}

type PluginContributions = {
  blueprints: Blueprint.Blueprint[];
  types: Type.AnyEntity[];
  handlers: OperationHandlerSet.OperationHandlerSet[];
};

const harvestFromPlugins = (plugins: Plugin.Plugin[]): Effect.Effect<PluginContributions> =>
  Effect.promise(async () => {
    if (plugins.length === 0) {
      return { blueprints: [], types: [], handlers: [] };
    }
    await using harness = await createComposerTestApp({
      plugins,
      // Skip SetupReactSurface + Startup — node tests only need the
      // declarative contributions (schemas, blueprints, operation handlers).
      // Firing SetupReactSurface would pull in browser-only lazy surfaces.
      autoStart: false,
    });
    await harness.fire(AppActivationEvents.SetupSchema);
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    await harness.fire(ActivationEvents.SetupOperationHandler);
    const blueprints = harness.getAll(AppCapabilities.BlueprintDefinition).map((def) => def.make());
    const types = harness.getAll(AppCapabilities.Schema).flat();
    const handlers = harness.getAll(Capabilities.OperationHandler);
    return { blueprints, types, handlers };
  });

export const agentTest: {
  (options: AgentTestOptions, prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
  (prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
} = (...args: [AgentTestOptions, Prompt.Prompt] | [Prompt.Prompt]) => {
  const [options = {}, prompt] = args.length === 1 ? [undefined, args[0]] : args;

  const model =
    options.model ?? (options.inferenceProvider === 'ollama' ? 'gpt-oss:20b' : '@anthropic/claude-opus-4-6');

  return Effect.fnUntraced(
    function* (_) {
      const contributions = yield* harvestFromPlugins(options.plugins ?? []);

      const TestLayer = AssistantTestLayer({
        aiServicePreset: options.inferenceProvider ?? 'edge-remote',
        model,
        disableLlmMemoization: options.disableLlmMemoization ?? false,
        operationHandlers: [
          ...DEFAULT_TOOLKIT_HANDLERS,
          ...contributions.handlers,
          ...(options.extraOperationHandlers ?? []),
        ],
        types: [...contributions.types, ...(options.extraTypes ?? [])],
        blueprints: [
          ...DEFAULT_TOOLKIT_BLUEPRINTS(),
          ...contributions.blueprints,
          ...(options.extraBlueprints ?? []),
        ],
        toolkits: [WebSearchToolkitOpaque],
      });

      const program = Effect.gen(function* () {
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
      });

      yield* program.pipe(Effect.provide(TestLayer));
    },
    TestHelpers.provideTestContext,
    options.testTag ? TestHelpers.taggedTest(options.testTag) : Function.identity,
  );
};
