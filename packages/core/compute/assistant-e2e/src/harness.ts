//
// Copyright 2026 DXOS.org
//

import { TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { AiService, type ModelName } from '@dxos/ai';
import { MemoizedAiService, MemoizedLanguageModel, TestAiService } from '@dxos/ai/testing';
import { type Plugin } from '@dxos/app-framework';
import { type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AgentPrompt, BlueprintManagerBlueprint, DatabaseBlueprint } from '@dxos/assistant-toolkit';
import { Operation, Routine, ServiceResolver } from '@dxos/compute';
import { Database, Ref, Tag } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestContextService, TestHelpers } from '@dxos/effect/testing';
import { type SpaceId } from '@dxos/keys';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

export const DEFAULT_TEST_TIMEOUT = 120_000;

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

interface AgentTestOptions extends Pick<Routine.MakeProps, 'name' | 'blueprints' | 'input' | 'output'> {
  /** Agent instructions; the specification for the test. */
  instructions: string;

  /** Bullet list of expected outcomes, appended to the instructions under a "Completion criteria" heading. */
  completionCriteria?: readonly string[];

  expect?: 'success' | 'failure';

  model?: ModelName;

  /**
   * @default 'direct'
   */
  inferenceProvider?: 'direct' | 'edge-local' | 'edge-remote' | 'ollama';

  disableLlmMemoization?: boolean;

  /** Additional plugins registered after the default composer plugin set. */
  plugins?: Plugin.Plugin[];
}

const formatInstructions = (instructions: string, completionCriteria: readonly string[] = []): string => {
  if (completionCriteria.length === 0) {
    return instructions;
  }
  const criteria = completionCriteria.map((item) => `- ${item}`).join('\n');
  return `${instructions}\n\nCompletion criteria:\n${criteria}`;
};

const makeMemoizedAiServiceMiddleware = (
  ctx: TestContext,
  options: Pick<AgentTestOptions, 'inferenceProvider' | 'disableLlmMemoization'>,
): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.AiService.pipe(
    Effect.provide(
      TestAiService({
        preset: options.inferenceProvider ?? 'direct',
        disableMemoization: options.disableLlmMemoization ?? false,
        // Space keys are derived from a fresh keypair every run, so canonicalize them for matching
        // and substitute the live values back into memoized responses on a cache hit.
        dynamicValuePatterns: [MemoizedLanguageModel.SPACE_ID_PATTERN],
      }).pipe(Layer.provideMerge(Layer.succeed(TestContextService, ctx))),
    ),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    Effect.runPromise,
  );

const createDefaultPlugins = async (ctx: TestContext, options: AgentTestOptions): Promise<Plugin.Plugin[]> => [
  ClientPlugin({
    types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Mailbox.Mailbox],
  }),
  AssistantPlugin({
    aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx, options),
  }),
  AutomationPlugin(),
  InboxPlugin(),
  ...(options.plugins ?? []),
];

const seedPrompt = (prompt: Routine.Routine) =>
  Effect.gen(function* () {
    for (const blueprintRef of prompt.blueprints) {
      const blueprint = yield* Database.load(blueprintRef);
      yield* Database.add(blueprint);
    }
    yield* Database.add(prompt);
    yield* Database.flush();
  });

const runAgentPrompt = (harness: TestHarness, prompt: Routine.Routine, model: ModelName, spaceId: SpaceId) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedPrompt(prompt);
      return yield* Operation.invoke(
        AgentPrompt,
        {
          prompt: Ref.make(prompt),
          input: {},
          systemInstructions: INSTRUCTIONS,
          model,
        },
        { spaceId },
      );
    }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
  );

export const agentTest = (options: AgentTestOptions): ((ctx: TestContext) => Effect.Effect<void, any>) => {
  const model =
    options.model ??
    (options.inferenceProvider === 'ollama' ? 'ai.ollama.model.gpt-oss:20b' : 'ai.claude.model.claude-opus-4-6');

  const prompt = Routine.make({
    name: options.name,
    instructions: formatInstructions(options.instructions, options.completionCriteria),
    blueprints: options.blueprints ?? getDefaultBlueprints(),
    input: options.input,
    output: options.output,
  });

  return Effect.fnUntraced(function* (ctx) {
    yield* Effect.scoped(
      Effect.gen(function* () {
        const harness = yield* Effect.acquireRelease(
          Effect.promise(async () =>
            createComposerTestApp({
              plugins: await createDefaultPlugins(ctx, options),
            }),
          ),
          (testHarness) => Effect.promise(() => testHarness.dispose()),
        );

        yield* Effect.promise(() => harness.fire(AppActivationEvents.SetupArtifactDefinition));

        const { personalSpace } = yield* Effect.promise(() =>
          EffectEx.runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client))),
        );

        if (options.expect === 'failure') {
          const exit: Exit.Exit<unknown, unknown> = yield* Effect.promise(() =>
            runAgentPrompt(harness, prompt, model, personalSpace.id).then(
              (value): Exit.Exit<unknown, unknown> => Exit.succeed(value),
              (cause): Exit.Exit<unknown, unknown> => Exit.fail(cause),
            ),
          );
          if (!Exit.isFailure(exit)) {
            return yield* Effect.fail(new Error('Expected the agent to fail, but it succeeded'));
          }
        } else {
          yield* Effect.promise(() => runAgentPrompt(harness, prompt, model, personalSpace.id));
        }
      }),
    );
  }, TestHelpers.provideTestContext);
};

// Use long timeout when generation is enabled or when running live (memoization disabled).
export const agentTestTimeout = (opts?: Pick<AgentTestOptions, 'disableLlmMemoization'>) =>
  MemoizedAiService.isGenerationEnabled() || opts?.disableLlmMemoization ? DEFAULT_TEST_TIMEOUT : undefined;
