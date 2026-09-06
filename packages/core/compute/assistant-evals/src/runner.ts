//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import type { Evalite } from 'evalite';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { type TestHarness } from '@dxos/app-framework/testing';
import { RunInstructions } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import type * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Ref, Tag, type Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, type SpaceId } from '@dxos/keys';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { getDefaultSkills } from './skills';

const DEFAULT_MODEL: DXN.DXN = DXN.make('com.anthropic.model.claude-opus-5.default');

/** Per-eval fallback; scenarios with more tool round-trips should pass an explicit `timeout`. */
const DEFAULT_EVAL_TIMEOUT_MILLIS = 60_000;

class EvalTimeoutError extends Data.TaggedError('EvalTimeoutError')<{ millis: number }> {}

/**
 * Tags a failure as coming specifically from the agent's own `RunInstructions` invocation —
 * distinct from a harness setup/disposal problem or other infrastructure failure, neither of
 * which is "the agent failed as instructed" (see `expect: 'failure'` handling below).
 */
class AgentRunFailure extends Data.TaggedError('AgentRunFailure')<{ cause: unknown }> {}

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
  AiService.tag.pipe(
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    EffectEx.runAndForwardErrors,
  );

const createDefaultPlugins = async (options: {
  plugins?: Plugin.Plugin[];
  types?: Type.AnyEntity[];
}): Promise<Plugin.Plugin[]> => [
  ClientPlugin.make({
    types: [
      Organization.Organization,
      Person.Person,
      Employer.Employer,
      Tag.Tag,
      Mailbox.Mailbox,
      ...(options.types ?? []),
    ],
  }),
  AssistantPlugin.make({
    aiServiceMiddleware: await makeAiServiceMiddleware(),
  }),
  RoutinePlugin.make(),
  InboxPlugin.make(),
  SpacePlugin.make({}),
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
  seededChat?: Ref.Ref<Chat.Chat>,
) =>
  harness.runPromise(
    Effect.gen(function* () {
      yield* seedInstructions(instructions);

      let chatRef: Ref.Ref<Chat.Chat> | undefined = seededChat;
      if (!chatRef && sessionChat) {
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
   * (e.g. the planning skill's `update-tasks` resolves its plan via `Harness.getChat`).
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
  /**
   * Additional ECHO types the scenario's seed/dbQuery touch, registered with the harness client.
   */
  types?: Type.AnyEntity[];
  /**
   * Seeds the space before the run (e.g. a Project the scenario operates on). Runs inside the
   * harness with `Database.Service` provided; receives the run's `Instructions` object so seeded
   * entities can reference it (it is added to the DB after seeding). Returned `objects` are bound
   * into the session context alongside the instructions' own; a returned `chat` is used as the
   * session chat (taking precedence over `sessionChat`).
   */
  seed?: (context: {
    spaceId: SpaceId;
    instructions: Instructions.Instructions;
  }) => Effect.Effect<SeedResult, unknown, Database.Service>;
}

/** Entities a {@link CreateEvalRunnerOptions.seed} hook contributes to the run. */
export type SeedResult = {
  objects?: Ref.Ref<Obj.Unknown>[];
  chat?: Ref.Ref<Chat.Chat>;
};

/** A deterministic DB-state assertion run after the agent completes, before the harness is disposed. */
export type DbQuery<I, D> = (
  input: I,
  spaceId: SpaceId,
) => Effect.Effect<D, unknown, Database.Service | FeedTraceSink.FeedTraceSink>;

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
 * initializes an identity, then invokes `runInstructions` with the resolved model and the personal
 * space. All execution is wrapped in an Effect scope; errors are
 * propagated to the caller via `EffectEx.runAndForwardErrors`.
 *
 * Pass `dbQuery` to additionally run a deterministic DB-state assertion (TESTING.md dimension G)
 * while the space is still open; the task then returns `{ agentOutput, dbQuery }` instead of the
 * bare agent output, so a Scorer can grade the real effect rather than the model's own
 * self-reported completion.
 *
 * Pass `expect: 'failure'` for scenarios that assert the agent correctly fails; the task then
 * returns `{ failed: boolean }` instead of throwing, so a Scorer can grade "failed as instructed".
 * Only a failure of the agent's own `RunInstructions` invocation counts as `{ failed: true }` — a
 * harness setup/disposal problem or other infrastructure failure still throws, since neither is
 * evidence the agent behaved as instructed.
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

        const { defaultSpace } = yield* Effect.promise(() =>
          EffectEx.runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client))),
        );

        let seeded: SeedResult = {};
        const seedFn = options.seed;
        if (seedFn) {
          seeded = yield* Effect.promise(() =>
            harness.runPromise(
              seedFn({ spaceId: defaultSpace.id, instructions }).pipe(
                Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service)),
              ),
            ),
          );
          if (seeded.objects?.length) {
            const objects = seeded.objects;
            Obj.update(instructions, (instructions) => {
              instructions.objects = [...(instructions.objects ?? []), ...objects];
            });
          }
        }

        const agentOutput = yield* Effect.tryPromise({
          try: () =>
            runInstructions(harness, instructions, model, defaultSpace.id, input, options.sessionChat, seeded.chat),
          catch: (cause) => new AgentRunFailure({ cause }),
        });

        const dbQueryFn = options.dbQuery;
        if (!dbQueryFn) {
          return agentOutput;
        }

        const dbQuery = yield* Effect.promise(() =>
          harness.runPromise(
            dbQueryFn(input, defaultSpace.id).pipe(
              Effect.provide(
                ServiceResolver.provide({ space: defaultSpace.id }, Database.Service, FeedTraceSink.FeedTraceSink),
              ),
            ),
          ),
        );

        return { agentOutput, dbQuery };
      }),
    );

    const timeoutMillis = options.timeout ?? DEFAULT_EVAL_TIMEOUT_MILLIS;
    const timedRun = run.pipe(
      Effect.timeoutOrElse({
        duration: timeoutMillis,
        orElse: () => new EvalTimeoutError({ millis: timeoutMillis }),
      }),
    );

    if (options.expect !== 'failure') {
      return EffectEx.runAndForwardErrors(timedRun);
    }

    const exit = await Effect.runPromiseExit(timedRun);
    if (Exit.isSuccess(exit)) {
      return { failed: false };
    }

    // Only a failure of the agent's own RunInstructions invocation counts as "failed as
    // instructed" — a timeout, harness setup/disposal problem, or other infrastructure failure
    // means the run never got far enough to demonstrate anything, so it must propagate as a real
    // error instead of being silently scored as a pass.
    if (Option.exists(Cause.findErrorOption(exit.cause), (error) => error instanceof AgentRunFailure)) {
      return { failed: true };
    }
    return EffectEx.unwrapExit(exit);
  };
}
