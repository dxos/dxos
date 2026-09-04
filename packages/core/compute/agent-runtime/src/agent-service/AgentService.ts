//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager, RemoteProcessManager } from '@dxos/compute-runtime';
import {
  type AgentLocation,
  AgentService,
  type Conversation,
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
import { DXN, EID, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ContentBlock } from '@dxos/types';

import { AGENT_PROCESS_KEY, AgentProcess } from './agent-process';
import { type DelegationStrategy } from './delegation-strategy';
import { type MakeTurnProducer } from './turn-producer';

/** The RPC control surface declared by {@link AgentProcess}, recovered from the executable type. */
type AgentRpcs = ReturnType<typeof AgentProcess> extends Process.Process<any, any, any, infer Rpcs> ? Rpcs : never;

/**
 * Live handle to a spawned {@link AgentProcess}, carrying its `HarnessControl` RPC surface.
 *
 * Derived from the definition rather than restated: `Process` exposes its input/output codecs, which
 * puts `_Input` in an invariant position, so a hand-written `ContentBlock.Any[]` no longer relates to
 * the `readonly` array the process's own schema yields.
 */
type AgentHandle =
  ReturnType<typeof AgentProcess> extends Process.Process<infer Input, infer Output, any, infer Rpcs>
    ? ProcessManager.Handle<Input, Output, Rpcs>
    : never;

// TERMINATING counts as terminal: the handle is already `#finished`, so adopting one would drop
// every submitted input and leave the turn waiting for a process that will never run again.
const isTerminalProcess = (state: Process.State): boolean =>
  state === Process.State.SUCCEEDED ||
  state === Process.State.FAILED ||
  state === Process.State.TERMINATED ||
  state === Process.State.TERMINATING;

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

  // The agent process runs on a chat, so the conversation gets one even when the caller only
  // wanted a bare session.
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
  return yield* getSession(chat, { model: opts?.model, provider: opts?.provider });
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

  /**
   * Resolves the manager that hosts `location: 'edge'` sessions, on demand. Absent — only local
   * agents can run. Resolved per call rather than required by this layer: a build-time requirement
   * would prune the whole provider (and `AgentService` with it) on a stack hosting only local
   * agents.
   */
  getRemoteManager?: () => Effect.Effect<RemoteProcessManager.Manager, unknown, Scope.Scope>;
}

export const layer = (opts?: AgentServiceOptions): Layer.Layer<AgentService, never, ProcessManager.Service> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* ProcessManager.Service;

      // Spaces an edge session has been opened on this run. One remote manager spans them all and
      // each of its verbs takes the space it addresses, so this is what `hydrate` has to walk.
      const remoteSpaces = new Set<SpaceId>();

      /**
       * The two process verbs a session needs, over the location it asked for.
       *
       * The choice is made here rather than behind a façade presenting the remote manager as a local
       * one: a remote process is not a local one (the two manager tags say so), and unifying them for
       * a caller that wants a single agent surface is this layer's job.
       *
       * `edge` needs the space, since one remote manager spans them, and a chat with no space cannot
       * name where its agent would run.
       */
      const processesFor = (location: AgentLocation | undefined, spaceId: SpaceId | undefined) => {
        if (location !== 'edge') {
          return {
            list: (options: ProcessManager.ListOptions) => processManager.list(options),
            spawn: (definition: ReturnType<typeof makeExecutable>, options: ProcessManager.SpawnOptions) =>
              processManager.spawn(definition, options),
          };
        }
        if (!spaceId) {
          throw new Error('Agent requested on edge, but its conversation has no space.');
        }
        const getRemoteManager = opts?.getRemoteManager;
        if (!getRemoteManager) {
          throw new Error('Agent requested on edge, but no RemoteProcessManager is available.');
        }
        // Scoped per call: the manager itself is owned by the stack that resolves it, so the scope
        // covers only the resolution.
        const withRemote = <A>(use: (manager: RemoteProcessManager.Manager) => Effect.Effect<A>) =>
          Effect.scoped(Effect.flatMap(getRemoteManager(), use)).pipe(Effect.orDie);
        remoteSpaces.add(spaceId);
        return {
          list: (options: ProcessManager.ListOptions) =>
            withRemote((manager) => {
              if (!manager.list) {
                throw new Error('Agent requested on edge, but RemoteProcessManager offers no process control.');
              }
              return manager.list({ spaceId, ...options });
            }),
          spawn: (definition: ReturnType<typeof makeExecutable>, options: ProcessManager.SpawnOptions) =>
            withRemote((manager) => {
              if (!manager.spawn) {
                throw new Error('Agent requested on edge, but RemoteProcessManager offers no process control.');
              }
              // Only the key crosses the wire; the definition stays local, supplying the codecs and
              // the RPC group the returned handle is typed by.
              return manager.spawn({ spaceId, key: definition.key, definition, ...options });
            }),
        };
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

      // Serializes `getSession` per chat: discovery and spawn sit several suspensions before the
      // cache is written, so concurrent callers resolving the same conversation would each spawn a
      // process for it. Kept for the lifetime of the layer — one entry per chat, no bigger than the
      // session cache beside it.
      const sessionLocks = new Map<string, Semaphore.Semaphore>();
      const lockFor = (chatId: string): Semaphore.Semaphore => {
        const existing = sessionLocks.get(chatId);
        if (existing) {
          return existing;
        }
        const lock = Effect.runSync(Semaphore.make(1));
        sessionLocks.set(chatId, lock);
        return lock;
      };

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
        // Local, plus every space a session has already been opened on this run. A fresh client knows
        // no edge spaces yet and cannot enumerate them (one manager spans them all), but an edge agent
        // does not need the pre-warm: `getSession` reattaches to a process still running for its
        // chat, which is the path opening one takes.
        const agents = [
          ...(yield* processManager.list({ key: AGENT_PROCESS_KEY })),
          ...(yield* Effect.forEach([...remoteSpaces], (spaceId) =>
            processesFor('edge', spaceId).list({ key: AGENT_PROCESS_KEY }),
          )).flat(),
        ];
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
      });

      const service: Service = {
        getSession: (chat: Conversation, options?: GetSessionOptions) =>
          Effect.suspend(() =>
            lockFor(chat.id).withPermits(1)(
              Effect.gen(function* () {
                const model = options?.model ?? opts?.model;
                const provider = options?.provider ?? opts?.provider;
                // Read off the chat rather than passed in: the process is bound to the chat, so its
                // steering is whatever the chat points at when the process is spawned.
                const instructions = chat.instructions?.uri;
                const location: AgentLocation = options?.location ?? 'local';
                const cached = sessionCache.get(chat.id);
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
                    // Model, provider, steering instructions or location changed (e.g. the user
                    // toggled online/offline, or moved the chat to the cloud): terminate the
                    // existing process so the conversation continues on a fresh process bound to the new
                    // configuration. Conversation history is preserved via the feed, which the new
                    // process replays.
                    yield* cached.handle.terminate();
                  }
                  sessionCache.delete(chat.id);
                }

                const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
                const target = Obj.getURI(chat);
                const parsedEchoUri = EID.tryParse(target);
                const spaceId = parsedEchoUri ? EID.getSpaceId(parsedEchoUri) : undefined;
                const agentProcesses = processesFor(options?.location, spaceId);
                const executable = makeExecutable(model, provider);

                // Reuse a still-running process for this feed only when there was no cached session
                // (e.g. after the UI remounted). After a model change we always spawn a fresh process,
                // since the process key does not encode the model.
                const processes = yield* agentProcesses.list({ target, key: executable.key });
                let activeProcess = processes.find((process) => !isTerminalProcess(process.status.state));

                let handle: AgentHandle;
                if (activeProcess) {
                  // `hydrate` returns the live handle; the listed one may be a dormant view whose
                  // methods die with "Process not hydrated" (see ProcessManager's DormantHandle).
                  handle = yield* activeProcess.hydrate(executable);
                } else {
                  handle = yield* agentProcesses.spawn(executable, {
                    name: 'Agent',
                    target,
                    // Stamp the host marker so the harness control surface is discoverable by annotation
                    // lookup (set once at spawn, immutable — the identity plane).
                    annotations: Annotation.buildDictionary((dictionary) => {
                      Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
                    }),
                    environment: {
                      ...(spaceId !== undefined ? { space: spaceId } : {}),
                      conversation: Obj.getURI(feed),
                    },
                    traceMeta: {
                      conversation: Ref.make(feed),
                    },
                  });
                }

                const releaseSession = () => {
                  sessionCache.delete(chat.id);
                };
                const session = makeSession(handle, chat, feed, releaseSession);
                sessionCache.set(chat.id, { model, provider, instructions, location, handle, session });
                return session;
              }),
            ),
          ),
        hydrate: hydrateAgents,
      };

      return service;
    }),
  );

const makeSession = (
  process: AgentHandle,
  chat: Conversation,
  feed: Feed.Feed,
  releaseSession: () => void,
): Session => ({
  chat,
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
  // The stopped turn's queue entry is NOT discarded here: `terminate` blocks while a tool holds the
  // turn open, so anything it did afterwards would land after the reader's next prompt. The next
  // process to spawn on this feed discards what it inherits instead (see `onSpawn` in agent-process).
  terminate: () => process.terminate().pipe(Effect.tap(() => Effect.sync(releaseSession))),
  subscribeEphemeral: () => process.subscribeEphemeral(),
});
