//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type { ModelName } from '@dxos/ai';
import { AiContext } from '@dxos/assistant';
import { Skill, McpServer, Process } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import {
  AgentService,
  type GetSessionOptions,
  getSession,
  type Service,
  type Session,
} from '@dxos/compute/AgentService';
import { Annotation, Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';

import { AGENT_PROCESS_KEY, AgentProcess } from './agent-process';
import { type DelegationStrategy } from './delegation-strategy';

/** The RPC control surface declared by {@link AgentProcess}, recovered from the executable type. */
type AgentRpcs = ReturnType<typeof AgentProcess> extends Process.Process<any, any, any, infer Rpcs> ? Rpcs : never;

/** Live handle to a spawned {@link AgentProcess}, carrying its `HarnessControl` RPC surface. */
type AgentHandle = ProcessManager.Handle<string, void, AgentRpcs>;

const isTerminalProcess = (state: Process.State): boolean =>
  state === Process.State.SUCCEEDED || state === Process.State.FAILED || state === Process.State.TERMINATED;

export interface CreateSessionOptions {
  readonly skills?: Skill.Skill[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: ModelName;
  readonly systemPrompt?: string;
}

export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<Session, Skill.NotFoundError, Database.Service | Registry.Service | AgentService> = Effect.fn(
  'createSession',
)(function* (opts) {
  const skills = yield* Effect.forEach(opts?.skills ?? [], (skill) =>
    Skill.upsert(Skill.getKey(skill)).pipe(Effect.map(Ref.make)),
  );

  const feed = yield* Database.add(Feed.make());
  const runtime = yield* Effect.runtime<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));

  yield* Effect.promise(() =>
    binder.bind({
      skills,
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
   * Read confinement (agent firewall): `'home'` (default, tier-0) reads only the hosting space;
   * `'membership'` (tier-1) reads across the user's in-process spaces. See {@link AgentProcess}.
   */
  readScope?: 'home' | 'membership';
}

export const layer = (opts?: AgentServiceOptions): Layer.Layer<AgentService, never, ProcessManager.Service> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;
      // The agent's model is bound to its process at spawn time, so the cache tracks the model
      // each session was created with. Requesting a different model for the same feed tears down
      // the old process and spawns a fresh one (see below).
      const sessionCache = new Map<string, { model: ModelName | undefined; handle: AgentHandle; session: Session }>();

      const makeExecutable = (model?: ModelName, readScope?: 'home' | 'membership') =>
        AgentProcess({
          systemPrompt: opts?.systemPrompt,
          model: model ?? opts?.model,
          getMcpServers: opts?.getMcpServers,
          enableToolBackgrounding: opts?.enableToolBackgrounding,
          delegationStrategy: opts?.delegationStrategy,
          // Per-session read scope (e.g. a personal-space chat) overrides the service default.
          readScope: readScope ?? opts?.readScope,
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
            const executable = makeExecutable(model, options?.readScope);

            // Reuse a still-running process for this feed only when there was no cached session
            // (e.g. after the UI remounted). After a model change we always spawn a fresh process,
            // since the process key does not encode the model.
            const processes = yield* processManager.list({ target, key: executable.key });
            const activeProcess = processes.find((process) => !isTerminalProcess(process.status.state));

            let handle: AgentHandle;
            if (activeProcess) {
              yield* activeProcess.hydrate(executable);
              handle = activeProcess;
            } else {
              handle = yield* processManager.spawn(executable, {
                name: 'Agent',
                target,
                // Stamp the host marker so the harness control surface is discoverable by annotation
                // lookup (set once at spawn, immutable — the identity plane).
                annotations: Annotation.buildDictionary((dictionary) => {
                  Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
                }),
                environment: {
                  ...(spaceId !== undefined ? { space: spaceId } : {}),
                  conversation: target,
                },
                traceMeta: {
                  conversation: Ref.make(feed),
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

const makeSession = (process: AgentHandle, feed: Feed.Feed, releaseSession: () => void): Session => ({
  feed,
  getContext: () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Database.Service>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      return binder.getObjects().map((object) => Ref.make(object));
    }).pipe(Effect.scoped),
  addContext: (context: Ref.Ref<Obj.Unknown>[]) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Database.Service>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          skills: [],
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
