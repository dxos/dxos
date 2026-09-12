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
import { afterAll } from 'vitest';

import { AiService, Model } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { type TestHarness } from '@dxos/app-framework/testing';
import { RunInstructions } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import { Config } from '@dxos/client';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import type * as Skill from '@dxos/compute/Skill';
import { EDGE_URLS } from '@dxos/config';
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

import * as Observe from './Observe.ts';
import * as Scorer from './Scorer.ts';
import { getDefaultSkills } from './skills.ts';
import * as Usage from './Usage.ts';

const DEFAULT_MODEL: DXN.DXN = DXN.make('com.anthropic.model.claude-opus-5.default');

/** Per-eval fallback; scenarios with more tool round-trips should pass an explicit `timeout`. */
const DEFAULT_EVAL_TIMEOUT_MILLIS = 60_000;

class EvalTimeoutError extends Data.TaggedError('EvalTimeoutError')<{ millis: number }> {}

/** What a graded incomplete session returns in place of the agent's output. */
export type AgentIncomplete =
  | { readonly timedOut: true; readonly millis: number }
  | { readonly failed: true; readonly error: string };

/** The failure a graded session ended in, as one line the scorers and a reader can use. */
const describeCause = (cause: unknown): string =>
  cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);

/** Room after the agent's budget for the harness to be stood up and torn down around it. */
const GRADE_GRACE_MILLIS = 5 * 60 * 1_000;

/** Distinguishes the open sessions of concurrently running rows, variants and files. */
let nextRunId = 0;

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

/**
 * The EDGE the harness reaches for a model it serves, and for the sandbox. Preview unless
 * overridden: it is what clients in the field reach, and dev does not serve every model route.
 */
const EDGE_URL = process.env.DX_EDGE_BASE_URL ?? EDGE_URLS.preview;

/**
 * Whether a model is served through EDGE with the harness identity, the way the app serves it,
 * rather than by the direct testing preset with a vendor key. DeepSeek has no key of its own to
 * give; the edge path needs nothing but the identity the run creates.
 */
const servedByEdge = (model: DXN.DXN): boolean => Model.developer(model) === 'com.deepseek';

const directAiService = (): Promise<AiService.Service> =>
  AiService.tag.pipe(Effect.provide(AiServiceTestingPreset('direct')), EffectEx.runAndForwardErrors);

const createDefaultPlugins = async (options: {
  plugins?: Plugin.Plugin[];
  types?: Type.AnyEntity[];
  config?: Config;
  model: DXN.DXN;
  record: (call: Usage.Call) => void;
}): Promise<Plugin.Plugin[]> => [
  ClientPlugin.make({
    // The scenario's config first; the edge URL only fills in where it left one out.
    config: new Config(options.config?.values ?? {}, { runtime: { services: { edge: { url: EDGE_URL } } } }),
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
    // The plugin's own resolvers serve an EDGE model through EDGE, authenticated as the run.
    aiServiceMiddleware: servedByEdge(options.model)
      ? (upstream) => Usage.instrument(upstream, options.record)
      : await directAiService().then((direct) => () => Usage.instrument(direct, options.record)),
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
  /**
   * The skills bound to the run. A function is called per run: variants of one eval run
   * concurrently in one process, and a skill object added to one run's database cannot be added to
   * another's.
   */
  skills?: Ref.Ref<Skill.Skill>[] | (() => Ref.Ref<Skill.Skill>[]);
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
   * Grade the state a session reached when it runs out of `timeout` or fails, rather than throwing:
   * the agent's output becomes an {@link AgentIncomplete} and the scorers still run. For a scenario
   * long enough that where it got to is worth knowing. Requires `scored`; a timed-out session is not
   * stopped, so the scorers then read a space the agent may still be writing to.
   */
  gradeIncomplete?: boolean;
  /**
   * Additional ECHO types the scenario's seed and scorers touch, registered with the harness client.
   */
  types?: Type.AnyEntity[];
  /**
   * Client config for the harness, for a scenario whose tools reach a service outside the process
   * (a sandbox, say). The EDGE URL defaults to preview, or `DX_EDGE_BASE_URL`.
   */
  config?: Config;
  /**
   * Keeps this run's space open past the task so the eval's own scorers can query it (see
   * {@link Scorer}), and returns `{ runId, agentOutput, durationMillis }` in place of the bare agent
   * output. The harness is disposed by the `afterAll` this runner registers, once every row of the
   * eval has been graded. Leave it unset for an eval graded from the agent's output alone.
   */
  scored?: boolean;
  /**
   * Seeds the space before the run (e.g. a Project the scenario operates on). Runs inside the
   * harness with `Database.Service` and the runtime's capability services provided (so a seed can
   * reach the client for the space itself); receives the run's `Instructions` object so seeded
   * entities can reference it (it is added to the DB after seeding). Returned `objects` are bound
   * into the session context alongside the instructions' own; a returned `chat` is used as the
   * session chat (taking precedence over `sessionChat`).
   */
  seed?: (context: {
    spaceId: SpaceId;
    instructions: Instructions.Instructions;
  }) => Effect.Effect<SeedResult, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>;
}

/** Entities a {@link CreateEvalRunnerOptions.seed} hook contributes to the run. */
export type SeedResult = {
  objects?: Ref.Ref<Obj.Unknown>[];
  chat?: Ref.Ref<Chat.Chat>;
};

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
 * Pass `scored: true` to keep the space open past the task (TESTING.md dimension G); the task then
 * returns `{ runId, agentOutput, durationMillis }` instead of the bare agent output, and the eval's
 * `Scorer.toEvalite` dimensions grade the real effect rather than the model's self-reported one.
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
export function createEvalRunner<I, O>(
  options: CreateEvalRunnerOptions<I, O> & { scored: true },
): Evalite.Task<I, { runId: string; agentOutput: O | AgentIncomplete; durationMillis: number }, VariantConfig>;
export function createEvalRunner<I, O>(options: CreateEvalRunnerOptions<I, O>): Evalite.Task<I, O, VariantConfig>;
export function createEvalRunner<I, O>(
  options: CreateEvalRunnerOptions<I, O>,
): Evalite.Task<
  I,
  O | { runId: string; agentOutput: O | AgentIncomplete; durationMillis: number } | { failed: boolean },
  VariantConfig
> {
  // The harnesses this eval's rows left open, by run id. Registered at collection time on the file's
  // suite: evalite grades a row inside that row's own test, so a harness can only go once every row
  // of this eval has been scored.
  const open = new Map<string, () => Promise<void>>();
  afterAll(async () => {
    const disposals = [...open.entries()];
    open.clear();
    for (const [runId, dispose] of disposals) {
      Scorer.closeSession(runId);
      await dispose();
    }
  });

  const execute = async (input: I, variant: VariantConfig, record: (call: Usage.Call) => void) => {
    const model = variant?.model ?? options.model ?? DEFAULT_MODEL;
    const timeoutMillis = options.timeout ?? DEFAULT_EVAL_TIMEOUT_MILLIS;
    const gradeIncomplete = options.gradeIncomplete === true && options.scored === true;

    const instructions = Instructions.make({
      text: options.instructions,
      skills: (typeof options.skills === 'function' ? options.skills() : options.skills) ?? getDefaultSkills(),
    });

    const runId = `${nextRunId++}`;

    // Scoped for the ungraded path's finalizer; a scored run's harness is not on this scope.
    const run = Effect.scoped(
      Effect.gen(function* () {
        // Not `acquireRelease`: a scored run's harness outlives this effect, so that the eval's
        // scorers can query the space it left. It is registered below and disposed by `afterAll`.
        const harness = yield* Effect.promise(async () =>
          createComposerTestApp({
            plugins: await createDefaultPlugins({ ...options, model, record }),
          }),
        );
        if (options.scored) {
          open.set(runId, () => harness.dispose());
        } else {
          yield* Effect.addFinalizer(() => Effect.promise(() => harness.dispose()));
        }

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
              instructions.objects ??= [];
              instructions.objects.push(...objects);
            });
          }
        }

        const agentStep = Effect.tryPromise({
          try: () =>
            runInstructions(harness, instructions, model, defaultSpace.id, input, options.sessionChat, seeded.chat),
          catch: (cause) => new AgentRunFailure({ cause }),
        });
        if (!options.scored) {
          return yield* agentStep;
        }

        // The session's wall clock, for a scorer that wants the work done soon as well as done.
        const startedAt = Date.now();
        const agentOutput: O | AgentIncomplete = gradeIncomplete
          ? yield* agentStep.pipe(
              Effect.timeoutOrElse({
                duration: timeoutMillis,
                orElse: () => Effect.succeed<AgentIncomplete>({ timedOut: true, millis: timeoutMillis }),
              }),
              Effect.catch((failure) =>
                Effect.succeed<AgentIncomplete>({ failed: true, error: describeCause(failure.cause) }),
              ),
            )
          : yield* agentStep;
        const durationMillis = Date.now() - startedAt;

        // What a scorer runs against: the space and its trace feed, the runtime's operations, and
        // what this run reports about itself.
        const space = ServiceResolver.provide(
          { space: defaultSpace.id },
          Database.Service,
          FeedTraceSink.FeedTraceSink,
        );
        const provideRun = Scorer.sessionServices({ durationMillis });

        // Graded one dimension at a time: `Scorer.shared` memoizes a completed exit, so two
        // dimensions naming one query must not be in flight together.
        let queued: Promise<unknown> = Promise.resolve();
        Scorer.openSession(runId, {
          grade: (scorer) => {
            const graded = queued.then(() =>
              harness.runPromise(provideRun(Effect.exit(scorer.score)).pipe(Effect.provide(space))),
            );
            queued = graded.catch(() => undefined);
            return graded;
          },
        });
        return { runId, agentOutput, durationMillis };
      }),
    );

    // A graded timeout fires inside; the outer net then only has to clear the grading itself.
    const netMillis = gradeIncomplete ? timeoutMillis + GRADE_GRACE_MILLIS : timeoutMillis;
    const timedRun = run.pipe(
      Effect.timeoutOrElse({
        duration: netMillis,
        orElse: () => new EvalTimeoutError({ millis: netMillis }),
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

  return async (input: I, variant: VariantConfig) => {
    const calls: Usage.Call[] = [];
    const experiment = Observe.experiment();
    const run = Observe.start(experiment);
    const record = (call: Usage.Call) => {
      calls.push(call);
      run.generation(call);
    };
    try {
      return await execute(input, variant, record);
    } finally {
      Usage.report(calls, { traceId: run.traceId, experimentId: experiment.id, experimentName: experiment.name });
      await run.finish();
    }
  };
}
