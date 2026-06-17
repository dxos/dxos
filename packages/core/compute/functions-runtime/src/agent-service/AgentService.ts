//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { ModelName } from '@dxos/ai';
import { AiContext } from '@dxos/assistant';
import { type Trace, Blueprint, McpServer, Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';

import { AGENT_PROCESS_KEY, AgentProcess } from './agent-process';
import { type CompletionGuard } from './completion-guard';
import { type DelegationStrategy } from './delegation-strategy';

const isTerminalProcess = (state: Process.State): boolean =>
  state === Process.State.SUCCEEDED || state === Process.State.FAILED || state === Process.State.TERMINATED;

export interface Service {
  /**
   * Gets or creates a session for a feed.
   */
  getSession: (feed: Feed.Feed, options?: GetSessionOptions) => Effect.Effect<Session>;

  /**
   * Hydrates agent processes persisted by a previous session.
   * Each record is rehydrated with a fresh {@link AgentProcess} built from the layer options.
   */
  hydrate: () => Effect.Effect<void>;
}

export class AgentService extends Context.Tag('@dxos/functions-runtime/AgentService')<AgentService, Service>() {}

/**
 * Handle to an agent session.
 */
export interface Session {
  /**
   * The feed that the session is associated with.
   */
  readonly feed: Feed.Feed;

  /**
   * Gets the context objects from the agent.
   */
  getContext: () => Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Feed.FeedService>;

  /**
   * Adds context objects to the agent.
   */
  addContext: (context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void, never, Feed.FeedService>;

  /**
   * Submits a prompt to the agent.
   */
  submitPrompt: (prompt: string) => Effect.Effect<void>;

  /**
   * Wait until agent has completed its work.
   */
  waitForCompletion: () => Effect.Effect<void>;

  /**
   * Terminates the agent process and clears its durable storage.
   */
  terminate: () => Effect.Effect<void>;

  /**
   * Subscribe to ephemeral trace events (e.g., streaming partial messages).
   * Replays buffered events, then streams new ones until the process ends.
   */
  subscribeEphemeral: () => Stream.Stream<Trace.Message>;
}

/**
 * Gets or creates a session for a feed.
 */
export const getSession = Effect.serviceFunctionEffect(AgentService, (service) => service.getSession);

export const hydrate = Effect.serviceFunctionEffect(AgentService, (service) => service.hydrate);

export interface GetSessionOptions {
  readonly model?: ModelName;
  readonly systemPrompt?: string;
}

export interface CreateSessionOptions {
  readonly blueprints?: Blueprint.Blueprint[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: ModelName;
  readonly systemPrompt?: string;
}

export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<
  Session,
  Blueprint.NotFoundError,
  Database.Service | Feed.FeedService | Registry.Service | AgentService
> = Effect.fn('createSession')(function* (opts) {
  const blueprints = yield* Effect.forEach(opts?.blueprints ?? [], (blueprint) =>
    Blueprint.upsert(Blueprint.getKey(blueprint)).pipe(Effect.map(Ref.make)),
  );

  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.runtime<Feed.FeedService>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));

  yield* Effect.promise(() =>
    binder.bind({
      blueprints,
      objects: opts?.context ?? [],
    }),
  );

  return yield* getSession(feed, { model: opts?.model });
}, Effect.scoped);

export interface AgentServiceOptions {
  systemPrompt?: string;
  /**
   * Default model used by sessions that don't specify one explicitly.
   */
  model?: ModelName;

  /**
   * Provider for space-level MCP server configs.
   */
  getMcpServers?: () => McpServer.McpServer[];

  /**
   * If true, long-running tool calls are moved to the background and the agent is notified
   * asynchronously when they complete. Currently unstable — disabled by default.
   *
   * @default false
   */
  enableToolBackgrounding?: boolean;

  /**
   * When provided, sessions act as supervisors: the agent delegates outstanding work to sub-agent
   * child processes and folds their results back into the conversation. Absent — a plain agent.
   */
  delegationStrategy?: DelegationStrategy;

  /**
   * When provided, checks agent-attached plan tasks before the process succeeds.
   */
  completionGuard?: CompletionGuard;
}

export const layer = (opts?: AgentServiceOptions): Layer.Layer<AgentService, never, ProcessManager.Service> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;
      // The agent's model is bound to its process at spawn time, so the cache tracks the model
      // each session was created with. Requesting a different model for the same feed tears down
      // the old process and spawns a fresh one (see below).
      const sessionCache = new Map<
        string,
        { model: ModelName | undefined; handle: ProcessManager.Handle<string, void>; session: Session }
      >();

      const makeExecutable = (model?: ModelName) =>
        AgentProcess({
          systemPrompt: opts?.systemPrompt,
          model: model ?? opts?.model,
          getMcpServers: opts?.getMcpServers,
          enableToolBackgrounding: opts?.enableToolBackgrounding,
          delegationStrategy: opts?.delegationStrategy,
          completionGuard: opts?.completionGuard,
        });

      const hydrateAgents = Effect.fnUntraced(function* () {
        // Handles cached before shutdown are suspended and no longer registered with the manager.
        sessionCache.clear();

        const executable = makeExecutable();
        const agents = yield* processManager.list({ key: AGENT_PROCESS_KEY });
        log('agent hydrate', { count: agents.length });
        for (const agent of agents) {
          yield* agent
            .hydrate(executable)
            .pipe(
              Effect.catchAllCause((cause) =>
                Effect.sync(() => log.warn('agent hydrate skipped', { pid: agent.pid, cause: Cause.pretty(cause) })),
              ),
            );
        }
      });

      const service: Service = {
        getSession: (feed: Feed.Feed, options?: GetSessionOptions) =>
          Effect.gen(function* () {
            const model = options?.model ?? opts?.model;
            const cached = sessionCache.get(feed.id);
            if (cached) {
              if (cached.model === model && !isTerminalProcess(cached.handle.status.state)) {
                return cached.session;
              }

              if (!isTerminalProcess(cached.handle.status.state)) {
                // Model changed (e.g. the user toggled online/offline): terminate the existing
                // process so the conversation continues on a fresh process bound to the new model.
                // Conversation history is preserved via the feed, which the new process replays.
                yield* cached.handle.terminate();
              }
              sessionCache.delete(feed.id);
            }

            const target = Obj.getURI(feed);
            const parsedEchoUri = EID.tryParse(target);
            const spaceId = parsedEchoUri ? EID.getSpaceId(parsedEchoUri) : undefined;
            const executable = makeExecutable(model);

            // Reuse a still-running process for this feed only when there was no cached session
            // (e.g. after the UI remounted). After a model change we always spawn a fresh process,
            // since the process key does not encode the model.
            const processes = yield* processManager.list({ target, key: executable.key });
            const activeProcess = processes.find((process) => !isTerminalProcess(process.status.state));

            let handle: ProcessManager.Handle<string, void>;
            if (activeProcess) {
              yield* activeProcess.hydrate(executable);
              handle = activeProcess;
            } else {
              handle = yield* processManager.spawn(executable, {
                name: 'Agent',
                target,
                environment: {
                  ...(spaceId !== undefined ? { space: spaceId } : {}),
                  conversation: target,
                },
                traceMeta: {
                  conversationId: feed.id,
                },
              });
            }

            const releaseSession = () => {
              sessionCache.delete(feed.id);
            };
            const session = makeSession(handle, feed, releaseSession);
            sessionCache.set(feed.id, { model, handle, session });
            return session;
          }),
        hydrate: hydrateAgents,
      };

      return service;
    }),
  );

const makeSession = (
  process: ProcessManager.Handle<string, void>,
  feed: Feed.Feed,
  releaseSession: () => void,
): Session => ({
  feed,
  getContext: () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      return binder.getObjects().map((object) => Ref.make(object));
    }).pipe(Effect.scoped),
  addContext: (context: Ref.Ref<Obj.Unknown>[]) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Feed.FeedService>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: context,
        }),
      );
    }).pipe(Effect.scoped),
  submitPrompt: (prompt: string) => process.submitInput(prompt),
  // Settle when the turn's reply is complete; do NOT block on background sub-agents
  // (a supervisor delegates work that runs after the turn and reports back out of band).
  waitForCompletion: () => process.runUntilSettled(),
  terminate: () => process.terminate().pipe(Effect.tap(() => Effect.sync(releaseSession))),
  subscribeEphemeral: () => process.subscribeEphemeral(),
});
