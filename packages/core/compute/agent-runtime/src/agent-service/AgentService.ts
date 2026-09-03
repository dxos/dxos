//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AiContext } from '@dxos/assistant';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';
import { RemoteProcessManagerAdapter } from '@dxos/compute-runtime/remote-process';
import {
  AgentService,
  type AgentLocation,
  type GetSessionOptions,
  type Service,
  type Session,
  getSession,
} from '@dxos/compute/AgentService';
import * as McpServer from '@dxos/compute/McpServer';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, EID } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ContentBlock } from '@dxos/types';

import { AGENT_PROCESS_KEY, AgentProcess } from './agent-process';
import { type DelegationStrategy } from './delegation-strategy';
import { type MakeTurnProducer } from './turn-producer';

/**
 * Live handle to a spawned {@link AgentProcess}. Parameters are recovered from the definition rather
 * than restated, so a schema change cannot drift from them.
 */
type AgentHandle =
  ReturnType<typeof AgentProcess> extends Process.Process<infer Input, infer Output, any, infer Rpcs>
    ? ProcessManager.Handle<Input, Output, Rpcs>
    : never;

const isTerminalProcess = (state: Process.State): boolean =>
  state === Process.State.SUCCEEDED || state === Process.State.FAILED || state === Process.State.TERMINATED;

// TODO(burdon): Agent identity?
export interface CreateSessionOptions {
  readonly skills?: Skill.Skill[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: DXN.DXN;
  readonly provider?: DXN.DXN;
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
  const runtime = yield* Effect.context<Database.Service>();
  const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));

  yield* Effect.promise(() =>
    binder.bind({
      skills,
      objects: opts?.context ?? [],
    }),
  );

  return yield* getSession(feed, { model: opts?.model, provider: opts?.provider });
}, Effect.scoped);

export interface AgentServiceOptions {
  systemPrompt?: string;

  /**
   * Produces each turn. Defaults to DXOS's own `AiSession`; substituting it swaps the engine while
   * the process keeps ownership of the queue, alarms, redelivery, delegation and hydration.
   */
  makeTurnProducer?: MakeTurnProducer;

  /**
   * Default model used by sessions that don't specify one explicitly.
   */
  model?: DXN.DXN;

  /**
   * Default provider used to resolve the model for sessions that don't specify one explicitly.
   */
  provider?: DXN.DXN;

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
   * Provider for space-level MCP server configs.
   */
  getMcpServers?: () => McpServer.McpServer[];
}

export const layer = (
  opts?: AgentServiceOptions,
): Layer.Layer<
  AgentService,
  never,
  ProcessManager.Service | RemoteProcessManager.Service | AtomRegistry.AtomRegistry
> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;
      const remote = yield* RemoteProcessManager.Service;
      const registry = yield* AtomRegistry.AtomRegistry;

      // An agent asked for on EDGE is spawned and driven through the remote host's control surface,
      // presented as the same manager verbs. Built once per stack: the adapter caches the process
      // tree atom, so a second instance would give this service a different view from the monitor's.
      const remoteManager = remote.control
        ? new RemoteProcessManagerAdapter.RemoteProcessManagerAdapter(remote.control, registry, remote.processTreeAtom)
        : undefined;

      /**
       * The manager for a requested location. `edge` without a remote host that offers control is a
       * defect rather than a silent fall back to local: the caller asked for a conversation that
       * outlives the client, and running it locally would not deliver that.
       */
      const managerFor = (location: AgentLocation | undefined): ProcessManager.Manager => {
        if (location !== 'edge') {
          return processManager;
        }
        if (!remoteManager) {
          throw new Error(
            'Agent requested on edge, but RemoteProcessManager offers no process control. ' +
              'Provide EdgeProcessManager.forSpace(client, spaceId).',
          );
        }
        return remoteManager;
      };
      // The agent's model and steering instructions are bound to its process at spawn time, so the
      // cache tracks what each session was created with. Requesting a different model or a repointed
      // instructions ref for the same feed tears down the old process and spawns a fresh one (see below).
      const sessionCache = new Map<
        string,
        {
          model: DXN.DXN | undefined;
          provider: DXN.DXN | undefined;
          instructions: string | undefined;
          location: AgentLocation;
          handle: AgentHandle;
          session: Session;
        }
      >();

      const makeExecutable = (model?: DXN.DXN, provider?: DXN.DXN) =>
        AgentProcess({
          systemPrompt: opts?.systemPrompt,
          makeTurnProducer: opts?.makeTurnProducer,
          model: model ?? opts?.model,
          provider: provider ?? opts?.provider,
          getMcpServers: opts?.getMcpServers,
          enableToolBackgrounding: opts?.enableToolBackgrounding,
          delegationStrategy: opts?.delegationStrategy,
        });

      const hydrateAgents = Effect.fnUntraced(function* () {
        // Handles cached before shutdown are suspended and no longer registered with the manager.
        sessionCache.clear();

        const executable = makeExecutable();
        // Both runtimes: an edge-hosted agent kept running while the client was closed, which is the
        // whole point of hosting it there, and is exactly what a local-only hydrate would strand.
        const managers: ProcessManager.Manager[] = [processManager, ...(remoteManager ? [remoteManager] : [])];
        for (const manager of managers) {
          const agents = yield* manager.list({ key: AGENT_PROCESS_KEY });
          log('agent hydrate', { count: agents.length });
          for (const agent of agents) {
            yield* agent
              .hydrate(executable)
              .pipe(
                Effect.catchCause((cause) =>
                  Effect.sync(() => log.warn('agent hydrate skipped', { pid: agent.pid, cause: Cause.pretty(cause) })),
                ),
              );
          }
        }
      });

      const service: Service = {
        getSession: (feed: Feed.Feed, options?: GetSessionOptions) =>
          Effect.gen(function* () {
            const model = options?.model ?? opts?.model;
            const provider = options?.provider ?? opts?.provider;
            const instructions = options?.instructions?.uri;
            const location: AgentLocation = options?.location ?? 'local';
            const manager = managerFor(options?.location);
            const cached = sessionCache.get(feed.id);
            if (cached) {
              if (
                cached.model === model &&
                cached.provider === provider &&
                cached.instructions === instructions &&
                cached.location === location &&
                !isTerminalProcess(cached.handle.status.state)
              ) {
                return cached.session;
              }

              if (!isTerminalProcess(cached.handle.status.state)) {
                // Model, provider, steering instructions or location changed (e.g. the user toggled
                // online/offline, or moved the chat to the cloud): terminate the existing process so
                // the conversation continues on a fresh process bound to the new configuration.
                // Conversation history is preserved via the feed, which the new process replays.
                yield* cached.handle.terminate();
              }
              sessionCache.delete(feed.id);
            }

            const target = Obj.getURI(feed);
            const parsedEchoUri = EID.tryParse(target);
            const spaceId = parsedEchoUri ? EID.getSpaceId(parsedEchoUri) : undefined;
            const executable = makeExecutable(model, provider);

            // Reuse a still-running process for this feed only when there was no cached session
            // (e.g. after the UI remounted). After a model change we always spawn a fresh process,
            // since the process key does not encode the model.
            const processes = yield* manager.list({ target, key: executable.key });
            let activeProcess = processes.find((process) => !isTerminalProcess(process.status.state));

            // Spawn annotations are immutable, so a running process found via the remount path may
            // carry stale instructions; terminate it and respawn with the requested ref.
            if (activeProcess) {
              const processInstructions = Option.getOrUndefined(
                Annotation.getDictionary(activeProcess.params.annotations, Process.InstructionsAnnotation),
              );
              if (processInstructions !== instructions) {
                yield* activeProcess.terminate();
                activeProcess = undefined;
              }
            }

            let handle: AgentHandle;
            if (activeProcess) {
              yield* activeProcess.hydrate(executable);
              handle = activeProcess;
            } else {
              handle = yield* manager.spawn(executable, {
                name: 'Agent',
                target,
                // Stamp the host marker so the harness control surface is discoverable by annotation
                // lookup (set once at spawn, immutable — the identity plane).
                annotations: Annotation.buildDictionary((dictionary) => {
                  Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
                  if (options?.instructions) {
                    Annotation.setDictionary(dictionary, Process.InstructionsAnnotation, options.instructions.uri);
                  }
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
            sessionCache.set(feed.id, { model, provider, instructions, location, handle, session });
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
      const runtime = yield* Effect.context<Database.Service>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      return binder.getObjects().map((object) => Ref.make(object));
    }).pipe(Effect.scoped),
  addContext: (context: Ref.Ref<Obj.Unknown>[]) =>
    Effect.gen(function* () {
      const runtime = yield* Effect.context<Database.Service>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      yield* Effect.promise(() =>
        binder.bind({
          skills: [],
          objects: context,
        }),
      );
    }).pipe(Effect.scoped),
  submitPrompt: (prompt: string | ContentBlock.Any[]) => process.submitInput(prompt),
  // Derived from the process's status atom, written on the app-wide registry the UI reads.
  running: Atom.make(
    (get) =>
      get(process.statusAtom).state === Process.State.RUNNING ||
      get(process.statusAtom).state === Process.State.HYBERNATING,
  ),
  // Settle when the turn's reply is complete; do NOT block on background sub-agents
  // (a supervisor delegates work that runs after the turn and reports back out of band).
  waitForCompletion: () => process.runUntilSettled(),
  terminate: () => process.terminate().pipe(Effect.tap(() => Effect.sync(releaseSession))),
  subscribeEphemeral: () => process.subscribeEphemeral(),
});
