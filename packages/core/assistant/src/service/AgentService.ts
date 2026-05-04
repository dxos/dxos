//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { ModelName } from '@dxos/ai';
import { Blueprint, Routine } from '@dxos/compute';
import { type Trace } from '@dxos/compute';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { ProcessManager } from '@dxos/functions-runtime';

import { type McpServerConfig, AiContextBinder } from '../conversation';
import { RoutineError } from '../errors';
import { AgentProcess } from './agent-process';
import { RoutineProcess, RoutineRunInput } from './routine-process';

export interface Service {
  /**
   * Gets or creates a session for a feed.
   */
  getSession: (feed: Feed.Feed, options?: GetSessionOptions) => Effect.Effect<Session>;

  /**
   * Runs a routine to completion and returns the output.
   * Spawns a short-lived process that terminates after the routine completes.
   */
  runRoutine: (
    routineRef: Ref.Ref<Routine.Routine>,
    options?: RunRoutineOptions,
  ) => Effect.Effect<unknown, RoutineError, Database.Service | Feed.FeedService>;
}

export class AgentService extends Context.Tag('@dxos/assistant/AgentService')<AgentService, Service>() {}

/**
 * Handle to an agent session.
 */
export interface Session {
  /**
   * The feed that the session is associated with.
   */
  readonly feed: Feed.Feed;

  /**
   * Submits a prompt to the agent.
   */
  submitPrompt: (prompt: string) => Effect.Effect<void>;

  /**
   * Wait until agent has completed its work.
   */
  waitForCompletion: () => Effect.Effect<void>;

  /**
   * Subscribe to ephemeral trace events (e.g., streaming partial messages).
   * Replays buffered events, then streams new ones until the process ends.
   */
  subscribeEphemeral: () => Stream.Stream<Trace.Message>;

  /**
   * Adds context objects to the agent.
   */
  addContext: (context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void, never, Feed.FeedService>;

  /**
   * Gets the context objects from the agent.
   */
  getContext: () => Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Feed.FeedService>;
}

/**
 * Gets or creates a session for a feed.
 */
export const getSession = Effect.serviceFunctionEffect(AgentService, (service) => service.getSession);

/**
 * Runs a routine to completion and returns the output.
 */
export const runRoutine = Effect.serviceFunctionEffect(AgentService, (service) => service.runRoutine);

export interface GetSessionOptions {
  readonly model?: ModelName;
}

export interface RunRoutineOptions {
  readonly input?: unknown;
  readonly systemInstructions?: string;
  readonly model?: ModelName;
  /**
   * Use an existing feed for conversation context.
   * When not provided, a new feed is created for the routine execution.
   */
  readonly feed?: Feed.Feed;
}

export interface CreateSessionOptions {
  readonly blueprints?: Blueprint.Blueprint[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: ModelName;
}

export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<
  Session,
  Blueprint.NotFoundError,
  Database.Service | Feed.FeedService | Blueprint.RegistryService | AgentService
> = Effect.fn('createSession')(function* (opts) {
  const blueprints = yield* Effect.forEach(opts?.blueprints ?? [], (blueprint) =>
    Blueprint.upsert(blueprint.key).pipe(Effect.map(Ref.make)),
  );

  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.runtime<Feed.FeedService>();
  const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));

  yield* Effect.promise(() =>
    binder.bind({
      blueprints,
      objects: opts?.context ?? [],
    }),
  );

  return yield* getSession(feed, { model: opts?.model });
}, Effect.scoped);

export const layer = (opts?: {
  systemPrompt?: string;
  /**
   * Default model used by sessions that don't specify one explicitly.
   */
  model?: ModelName;

  /**
   * Provider for space-level MCP server configs.
   */
  getMcpServers?: () => McpServerConfig[];
}): Layer.Layer<AgentService, never, ProcessManager.Service> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;
      const sessionCache = new Map<string, Session>();

      return {
        getSession: (feed: Feed.Feed, options?: GetSessionOptions) =>
          Effect.gen(function* () {
            const cached = sessionCache.get(feed.id);
            if (cached) {
              return cached;
            }

            const target = Obj.getDXN(feed).toString();
            const executable = AgentProcess({
              systemPrompt: opts?.systemPrompt,
              model: options?.model ?? opts?.model,
              getMcpServers: opts?.getMcpServers,
            });
            const processes = yield* processManager.list({ target, key: executable.key });

            let handle: ProcessManager.Handle<string, void>;
            if (processes.length > 0) {
              handle = processes[0];
            } else {
              handle = yield* processManager.spawn(executable, {
                name: 'agent',
                target,
                traceMeta: {
                  conversationId: feed.id,
                },
              });
            }

            const session = makeSession(handle, feed);
            sessionCache.set(feed.id, session);
            return session;
          }),

        runRoutine: (routineRef: Ref.Ref<Routine.Routine>, options?: RunRoutineOptions) =>
          Effect.gen(function* () {
            const routine = yield* Database.load(routineRef).pipe(Effect.orDie);
            const routineDxn = Obj.getDXN(routine).toString();

            const feed = options?.feed ?? (yield* Database.add(Feed.make()));
            const feedDxn = Obj.getDXN(feed).toString();

            const runInput: RoutineRunInput = {
              routineDxn,
              feedDxn,
              input: options?.input,
              systemInstructions: options?.systemInstructions,
              model: options?.model,
            };

            const encodedInput = JSON.stringify(runInput);

            const handle = yield* processManager.spawn(RoutineProcess({ getMcpServers: opts?.getMcpServers }), {
              name: 'routine',
              target: feedDxn,
              traceMeta: {
                conversationId: feed.id,
              },
            });

            const outputs = yield* handle.runAndExit({ inputs: [encodedInput] }).pipe(Stream.runCollect);
            const output = Chunk.head(outputs);

            if (Option.isNone(output)) {
              return yield* Effect.fail(new RoutineError('Routine process produced no output.'));
            }

            const result = output.value;
            if (result._tag === 'failure') {
              return yield* Effect.fail(new RoutineError(result.message, { description: result.description }));
            }

            return result.value;
          }),
      };
    }),
  );

const makeSession = (process: ProcessManager.Handle<string, void>, feed: Feed.Feed): Session => ({
  feed,
  submitPrompt: (prompt: string) => process.submitInput(prompt),
  waitForCompletion: () => process.runToCompletion(),
  subscribeEphemeral: () => process.subscribeEphemeral(),
  addContext: (context: Ref.Ref<Obj.Unknown>[]) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: context,
        }),
      );
    }).pipe(Effect.scoped),
  getContext: () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* acquireReleaseResource(() => new AiContextBinder({ feed, runtime }));
      return binder.getObjects().map((object) => Ref.make(object));
    }).pipe(Effect.scoped),
});
