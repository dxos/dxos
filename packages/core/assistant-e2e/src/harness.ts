//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import { type TestContext } from 'vitest';

import { type ModelName } from '@dxos/ai';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { type Prompt } from '@dxos/blueprints';
import { Database, Feed, Ref, type Type } from '@dxos/echo';
import { TestContextService, TestHelpers, type TestTag } from '@dxos/effect/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { trim } from '@dxos/util';

export const DEFAULT_TEST_TIMEOUT = 120_000;

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
   * Composer plugins to load into the test harness. All blueprints, schemas,
   * operation handlers and toolkits are harvested from plugin contributions —
   * nothing is baked into the harness.
   */
  plugins?: Plugin.Plugin[];
}

const TestServicesMeta = {
  id: 'dxos.org/plugin/assistant-e2e-test-services',
  name: 'AssistantE2ETestServices',
};

interface TestServicesOptions {
  aiServicePreset: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';
  model: ModelName;
  disableLlmMemoization: boolean;
  testContext: TestContext;
}

/**
 * Contributes the runtime service layer (AI, database, feed, process manager,
 * tracing, etc.) to the managed runtime that `harness.invoke` uses to run
 * operations. Domain-level contributions (blueprints, schemas, operation
 * handlers, toolkits) come from the plugins the caller passes in.
 */
const TestServicesPlugin = Plugin.define<TestServicesOptions>(TestServicesMeta).pipe(
  Plugin.addModule((options: TestServicesOptions) => ({
    id: 'test-services-layer',
    activatesOn: ActivationEvents.SetupLayer,
    activate: () =>
      Effect.gen(function* () {
        const schemaArrays = yield* Capability.getAll(AppCapabilities.Schema);
        const types = (schemaArrays as unknown as Type.AnyEntity[][]).flat();
        const blueprintDefs = yield* Capability.getAll(AppCapabilities.BlueprintDefinition);
        const blueprints = blueprintDefs.map((def) => def.make());
        const toolkits = yield* Capability.getAll(AppCapabilities.Toolkit);
        const operationHandlers = yield* Capability.getAll(Capabilities.OperationHandler);

        const services = AssistantTestLayer({
          aiServicePreset: options.aiServicePreset,
          model: options.model,
          disableLlmMemoization: options.disableLlmMemoization,
          operationHandlers,
          types,
          blueprints,
          toolkits,
        });

        const layer = services.pipe(Layer.provide(Layer.succeed(TestContextService, options.testContext)));

        return Capability.contributes(Capabilities.Layer, layer);
      }),
  })),
  Plugin.make,
);

export const agentTest: {
  (options: AgentTestOptions, prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
  (prompt: Prompt.Prompt): (ctx: TestContext) => Effect.Effect<void, any>;
} = (...args: [AgentTestOptions, Prompt.Prompt] | [Prompt.Prompt]) => {
  const [options = {}, prompt] = args.length === 1 ? [undefined, args[0]] : args;

  const model =
    options.model ?? (options.inferenceProvider === 'ollama' ? 'gpt-oss:20b' : '@anthropic/claude-opus-4-6');

  return Effect.fnUntraced(
    function* (_) {
      const testContext = yield* TestContextService;

      const servicesPlugin = TestServicesPlugin({
        aiServicePreset: options.inferenceProvider ?? 'edge-remote',
        model,
        disableLlmMemoization: options.disableLlmMemoization ?? false,
        testContext,
      });

      const harness = yield* Effect.promise(() =>
        createComposerTestApp({
          plugins: [...(options.plugins ?? []), servicesPlugin],
          autoStart: false,
        }),
      );

      const body = Effect.gen(function* () {
        yield* Effect.promise(async () => {
          await harness.fire(AppActivationEvents.SetupSchema);
          await harness.fire(AppActivationEvents.SetupArtifactDefinition);
          await harness.fire(ActivationEvents.SetupOperationHandler);
          await harness.fire(ActivationEvents.Startup);
        });

        const runtime = harness.get(Capabilities.ManagedRuntime);
        yield* Effect.promise(() =>
          runtime.runPromise(
            Effect.gen(function* () {
              yield* Database.add(prompt);
              yield* Database.add(Feed.make());
              yield* Database.flush();
            }) as any,
          ),
        );

        const exit = yield* Effect.tryPromise(() =>
          harness.invoke(AgentPrompt, {
            prompt: Ref.make(prompt),
            input: {},
            systemInstructions: INSTRUCTIONS,
            model,
          }),
        ).pipe(Effect.exit);

        if (options.expect === 'failure') {
          if (!Exit.isFailure(exit)) {
            throw new Error('Expected the agent to fail, but it succeeded');
          }
        } else {
          yield* exit;
        }
      });

      yield* body.pipe(Effect.ensuring(Effect.promise(() => harness.dispose())));
    },
    TestHelpers.provideTestContext,
    options.testTag ? TestHelpers.taggedTest(options.testTag) : Function.identity,
  );
};
