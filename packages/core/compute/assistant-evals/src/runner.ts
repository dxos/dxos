//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import type { Evalite } from 'evalite';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { type Plugin } from '@dxos/app-framework';
import { type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Chat, RunInstructions } from '@dxos/assistant-toolkit';
import { Instructions, Operation, ServiceResolver, type Skill } from '@dxos/compute';
import { Database, Feed, Ref, Tag } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, type SpaceId } from '@dxos/keys';
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

import { getDefaultSkills } from './skills';

const DEFAULT_MODEL: DXN.DXN = DXN.make('com.anthropic.model.claude-opus-4-8.default');

/** Per-eval fallback; scenarios with more tool round-trips should pass an explicit `timeout`. */
const DEFAULT_EVAL_TIMEOUT_MILLIS = 60_000;

class EvalTimeoutError extends Error {
  constructor(millis: number) {
    super(`Eval exceeded its ${millis}ms timeout`);
  }
}

const SYSTEM_INSTRUCTIONS = trim`
  You are running within an evaluation environment.
  The prompt is the specification for the eval.
  Perform the instructions precisely and do not deviate.
  Do not fake any work if the provided tools don't work.
  The goal is to measure real behavior, so be honest about the results.
  If available tools prevented you from completing the task fully, report the failure.
  Do not fall back on your own knowledge, only use the tools provided.
`;

const makeAiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.AiService.pipe(
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    EffectEx.runAndForwardErrors,
  );

const createDefaultPlugins = async (options: { plugins?: Plugin.Plugin[] }): Promise<Plugin.Plugin[]> => [
  ClientPlugin({
    types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Mailbox.Mailbox],
  }),
  AssistantPlugin({
    aiServiceMiddleware: await makeAiServiceMiddleware(),
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

const runInstructions = <I>(
  harness: TestHarness,
  instructions: Instructions.Instructions,
  model: DXN.DXN,
  spaceId: SpaceId,
  input: I,
  sessionChat?: boolean,
) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedInstructions(instructions);

      let chatRef: Ref.Ref<Chat.Chat> | undefined;
      if (sessionChat) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), name: 'Eval Chat' }));
        yield* Database.flush();
        chatRef = Ref.make(chat);
      }

      return yield* Operation.invoke(
        RunInstructions,
        {
          instructions: Ref.make(instructions),
          input,
          systemInstructions: SYSTEM_INSTRUCTIONS,
          model,
          ...(chatRef ? { chat: chatRef } : {}),
        },
        { spaceId },
      );
    }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
  );

export interface CreateEvalRunnerOptions<I, O> {
  instructions: string;
  input: Schema.Schema<I>;
  output: Schema.Schema<O>;
  skills?: Ref.Ref<Skill.Skill>[];
  model?: DXN.DXN;
  plugins?: Plugin.Plugin[];
  /**
   * Provisions a {@link Chat} on the session feed so planning and other chat-scoped tools work
   * (e.g. the planning skill's `update-tasks` resolves its plan via `Chat.getFromContext`).
   */
  sessionChat?: boolean;
  /**
   * `'failure'` inverts the run's success semantics: an agent failure resolves the task as
   * `{ failed: true }` instead of rejecting, so a scorer can grade "failed as instructed" as a
   * pass. An unexpected success resolves as `{ failed: false }`, gradeable as a miss.
   * @default 'success'
   */
  expect?: 'success' | 'failure';
  /**
   * Milliseconds before the run is aborted. Raise this only for scenarios with more tool
   * round-trips than a typical single/couple-tool eval (e.g. a multi-step plan, or research across
   * several tools) — most evals should keep the default.
   * @default 60_000
   */
  timeout?: number;
}

/** A deterministic DB-state assertion run after the agent completes, before the harness is disposed. */
export type DbQuery<I, D> = (input: I, spaceId: SpaceId) => Effect.Effect<D, unknown, Database.Service>;

export type VariantConfig =
  | undefined
  | {
      model?: DXN.DXN;
    };

/**
 * Creates an Evalite task that runs the assistant against Instructions and returns the agent's output.
 *
 * Model precedence: `variant.model` → `options.model` → `DEFAULT_MODEL`.
 *
 * The task creates a full Composer test harness via `createComposerTestApp` / `createDefaultPlugins`,
 * initializes an identity, fires `SetupArtifactDefinition`, then invokes `runInstructions` with the
 * resolved model and the personal space. All execution is wrapped in an Effect scope; errors are
 * propagated to the caller via `EffectEx.runAndForwardErrors`.
 *
 * Pass `dbQuery` to additionally run a deterministic DB-state assertion (TESTING.md dimension G)
 * while the space is still open; the task then returns `{ agentOutput, dbQuery }` instead of the
 * bare agent output, so a Scorer can grade the real effect rather than the model's own
 * self-reported completion.
 *
 * Pass `expect: 'failure'` for scenarios that assert the agent correctly fails; the task then
 * returns `{ failed: boolean }` instead of throwing, so a Scorer can grade "failed as instructed".
 *
 * The run is aborted after `timeout` (default 60s, see {@link CreateEvalRunnerOptions.timeout}) —
 * evalite has no per-scenario timeout of its own, so this is what keeps a hung/slow scenario from
 * eating vitest's shared `testTimeout` budget. A timeout always throws, even under
 * `expect: 'failure'` (it is not evidence the agent "failed as instructed").
 */
export function createEvalRunner<I, O>(
  options: CreateEvalRunnerOptions<I, O> & { expect: 'failure' },
): Evalite.Task<I, { failed: boolean }, VariantConfig>;
export function createEvalRunner<I, O>(options: CreateEvalRunnerOptions<I, O>): Evalite.Task<I, O, VariantConfig>;
export function createEvalRunner<I, O, D>(
  options: CreateEvalRunnerOptions<I, O> & { dbQuery: DbQuery<I, D> },
): Evalite.Task<I, { agentOutput: O; dbQuery: D }, VariantConfig>;
export function createEvalRunner<I, O, D>(
  options: CreateEvalRunnerOptions<I, O> & { dbQuery?: DbQuery<I, D> },
): Evalite.Task<I, O | { agentOutput: O; dbQuery: D } | { failed: boolean }, VariantConfig> {
  return async (input: I, variant: VariantConfig) => {
    const model = variant?.model ?? options.model ?? DEFAULT_MODEL;

    const instructions = Instructions.make({
      text: options.instructions,
      skills: options.skills ?? getDefaultSkills(),
    });

    const run = Effect.scoped(
      Effect.gen(function* () {
        const harness = yield* Effect.acquireRelease(
          Effect.promise(async () =>
            createComposerTestApp({
              plugins: await createDefaultPlugins(options),
            }),
          ),
          (testHarness) => Effect.promise(() => testHarness.dispose()),
        );

        yield* Effect.promise(() => harness.fire(AppActivationEvents.SetupArtifactDefinition));

        const { personalSpace } = yield* Effect.promise(() =>
          EffectEx.runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client))),
        );

        const agentOutput = yield* Effect.promise(() =>
          runInstructions(harness, instructions, model, personalSpace.id, input, options.sessionChat),
        );

        const dbQueryFn = options.dbQuery;
        if (!dbQueryFn) {
          return agentOutput;
        }

        const dbQuery = yield* Effect.promise(() =>
          harness.runPromise(
            dbQueryFn(input, personalSpace.id).pipe(
              Effect.provide(ServiceResolver.provide({ space: personalSpace.id }, Database.Service)),
            ),
          ),
        );

        return { agentOutput, dbQuery };
      }),
    );

    const timeoutMillis = options.timeout ?? DEFAULT_EVAL_TIMEOUT_MILLIS;
    const timedRun = run.pipe(
      Effect.timeoutFail({
        duration: timeoutMillis,
        onTimeout: () => new EvalTimeoutError(timeoutMillis),
      }),
    );

    if (options.expect !== 'failure') {
      return EffectEx.runAndForwardErrors(timedRun);
    }

    const exit = await Effect.runPromiseExit(timedRun);
    if (
      Exit.isFailure(exit) &&
      Option.exists(Cause.failureOption(exit.cause), (error) => error instanceof EvalTimeoutError)
    ) {
      // A timeout is not "the agent failed as instructed" — it means the run never got far enough
      // to demonstrate anything, so it must not be scored as a pass.
      throw new EvalTimeoutError(timeoutMillis);
    }
    return { failed: Exit.isFailure(exit) };
  };
}
