//
// Copyright 2026 DXOS.org
//

import { TestContext } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';

import { AiService, type ModelName } from '@dxos/ai';
import { MemoizedAiService, MemoizedLanguageModel, TestAiService } from '@dxos/ai/testing';
import { type Plugin } from '@dxos/app-framework';
import { type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { RunInstructions, SkillManagerSkill, DatabaseSkill } from '@dxos/assistant-toolkit';
import { type ClientOptions } from '@dxos/client';
import { Operation, Instructions, ServiceResolver } from '@dxos/compute';
import { configPreset, type ConfigPresetOptions } from '@dxos/config';
import { Database, Obj, Ref, Tag, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestContextService, TestHelpers } from '@dxos/effect/testing';
import { traceFeedPrettyPrintSubscription } from '@dxos/functions-runtime/testing';
import { type SpaceId } from '@dxos/keys';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

export const DEFAULT_TEST_TIMEOUT = 360_000;

export const getDefaultSkills = () => [Ref.make(SkillManagerSkill.make()), Ref.make(DatabaseSkill.make())];

const INSTRUCTIONS = trim`
  You are running within a test environment.
  The prompt is the specification for the test.
  Perform the instructions precisely and do not deviate.
  Do not fake any work if the provided tools don't work.
  The goal is to test the system, so be honest about the results.
  If available tools prevented you from completing the task fully, report the failure.
  Do not fall back on your own knowledge, only use the tools provided.
`;

interface AgentTestOptions extends Pick<Instructions.MakeProps, 'name' | 'skills'> {
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

  /** Edge service preset for ClientPlugin config. */
  edge?: ConfigPresetOptions['edge'];

  /** Sandbox service preset for ClientPlugin config (`runtime.services.sandbox.url`). */
  sandbox?: ConfigPresetOptions['sandbox'];

  /** Additional ECHO types registered with ClientPlugin. */
  clientTypes?: ClientOptions['types'];

  /**
   * When true, skip per-test entity ID seeding so IDs vary between runs (e.g. sandbox-service KV).
   */
  randomEntityIds?: boolean;
}

const STABLE_ENTITY_ID_EPOCH = new Date('2025-01-01').getTime();

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

/** Stable per-test ULID seed derived from vitest's fully-qualified test name. */
const stableTestSeed = (ctx: TestContext): [time: number, seed: number] => {
  const hash = fnv1a(ctx.task.fullName);
  const time = STABLE_ENTITY_ID_EPOCH + (hash % 86_400_000);
  const seed = Math.imul(hash ^ (hash >>> 16), 0x9e3779b1) >>> 0;
  return [time, seed];
};

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
        // Space keys and entity IDs differ across runs; canonicalize for matching and
        // substitute live values back into memoized responses on a cache hit.
        dynamicValuePatterns: [MemoizedLanguageModel.SPACE_ID_PATTERN, MemoizedLanguageModel.ENTITY_ID_PATTERN],
      }).pipe(Layer.provideMerge(Layer.succeed(TestContextService, ctx))),
    ),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    Effect.runPromise,
  );

const DEFAULT_CLIENT_TYPES: Type.AnyEntity[] = [
  Organization.Organization,
  Person.Person,
  Employer.Employer,
  Tag.Tag,
  Mailbox.Mailbox,
];

const createDefaultPlugins = async (ctx: TestContext, options: AgentTestOptions): Promise<Plugin.Plugin[]> => [
  ClientPlugin({
    ...(options.edge || options.sandbox
      ? { config: configPreset({ edge: options.edge, sandbox: options.sandbox }) }
      : {}),
    types: [...DEFAULT_CLIENT_TYPES, ...(options.clientTypes ?? [])],
  }),
  AssistantPlugin({
    aiServiceMiddleware: await makeMemoizedAiServiceMiddleware(ctx, options),
  }),
  RoutinePlugin(),
  InboxPlugin(),
  ...(options.plugins ?? []),
];

const seedInstructions = (instructions: Instructions.Instructions) =>
  Effect.gen(function* () {
    for (const skillRef of instructions.skills) {
      const skill = yield* Database.load(skillRef);
      yield* Database.add(skill);
    }
    yield* Database.add(instructions);
    yield* Database.flush();
  });

const spaceServices = (spaceId: SpaceId) => ServiceResolver.provide({ space: spaceId }, Database.Service);

const runInstructions = (
  harness: TestHarness,
  instructions: Instructions.Instructions,
  model: ModelName,
  spaceId: SpaceId,
) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedInstructions(instructions);
      return yield* Operation.invoke(
        RunInstructions,
        {
          instructions: Ref.make(instructions),
          input: {},
          systemInstructions: INSTRUCTIONS,
          model,
        },
        { spaceId },
      );
    }).pipe(Effect.provide(spaceServices(spaceId))),
  );

const logTraceEvents = <A>(harness: TestHarness, spaceId: SpaceId) =>
  Effect.gen(function* () {
    const unsubscribe = yield* Effect.promise(() =>
      harness.runPromise(traceFeedPrettyPrintSubscription.pipe(Effect.provide(spaceServices(spaceId)))),
    );
    yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
  });

/**
 * Wraps a prompt spec as an agent e2e test.
 *
 * Callers must invoke `Obj.ID.dangerouslyDisableRandomness()` at module scope before `describe`;
 * each test run then pins a stable seed derived from `ctx.task.fullName`.
 */
export const agentTest = (options: AgentTestOptions): ((ctx: TestContext) => Effect.Effect<void, any>) => {
  const model =
    options.model ??
    (options.inferenceProvider === 'ollama' ? 'ai.ollama.model.gpt-oss:20b' : 'ai.claude.model.claude-opus-4-6');

  const OutputSchema = Schema.Struct({
    completedCriteria: Schema.Struct({
      ...Record.fromIterableWith(options.completionCriteria ?? [], (criterion) => [criterion, Schema.Boolean]),
    }).annotations({
      description: 'True/false for passed or not passed completion criteria.',
    }),
  });
  type OutputSchema = Schema.Schema.Type<typeof OutputSchema>;

  const instructions = Instructions.make({
    name: options.name,
    text: formatInstructions(options.instructions, options.completionCriteria),
    skills: options.skills ?? getDefaultSkills(),
    output: OutputSchema,
  });

  return Effect.fnUntraced(function* (ctx) {
    if (!options.randomEntityIds) {
      const [time, seed] = stableTestSeed(ctx);
      Obj.ID.dangerouslySetSeed(time, seed);
    }

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
        yield* logTraceEvents(harness, personalSpace.id);

        const exit = yield* Effect.promise(() => runInstructions(harness, instructions, model, personalSpace.id)).pipe(
          Effect.flatMap((output: OutputSchema) => {
            const missedCriteria = pipe(
              output.completedCriteria,
              Record.filter((isPassed, _) => !isPassed),
              Record.keys,
            );
            if (missedCriteria.length > 0) {
              return Effect.die(new Error(`Did not meet completion criteria: ${missedCriteria.join(', ')}`));
            }
            return Effect.void;
          }),
          Effect.exit,
        );

        if (options.expect === 'failure') {
          console.log('exit', exit);
          if (Exit.isSuccess(exit)) {
            return yield* Effect.fail(new Error('Expected the agent to fail, but it succeeded'));
          }
        } else if (Exit.isFailure(exit)) {
          return yield* Effect.fail(exit.cause);
        }
      }),
    );
  }, TestHelpers.provideTestContext);
};

// Use long timeout when generation is enabled or when running live (memoization disabled).
export const agentTestTimeout = (opts?: Pick<AgentTestOptions, 'disableLlmMemoization'>) =>
  MemoizedAiService.isGenerationEnabled() || opts?.disableLlmMemoization ? DEFAULT_TEST_TIMEOUT : undefined;
