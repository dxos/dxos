//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as Semaphore from 'effect/Semaphore';

import { AiContext, type HarnessControlRpcs } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import {
  type AgentLocation,
  AgentService,
  type Conversation,
  type GetSessionOptions,
  type Service,
  type Session,
  getSession,
} from '@dxos/compute/AgentService';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, EID, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ContentBlock } from '@dxos/types';

import { AGENT_PROCESS_KEY, type AgentInput, AgentProcess, type AgentProcessDefinition } from './agent-process.ts';
import { type DelegationStrategy } from './delegation-strategy.ts';
import { type MakeTurnProducer } from './turn-producer.ts';

/** Live handle to a spawned agent process, carrying its `HarnessControl` RPC surface. */
type AgentHandle = Process.Handle<AgentInput, void, HarnessControlRpcs>;

// TODO(burdon): Agent identity?
export interface CreateSessionOptions {
  readonly skills?: Skill.Skill[];
  readonly context?: Ref.Ref<Obj.Unknown>[];
  readonly model?: DXN.DXN;
  readonly provider?: DXN.DXN;
  readonly systemPrompt?: string;
}

/**
 * Creates a session on a fresh feed and chat, with `opts.skills` and `opts.context` bound to it.
 */
export const createSession: (
  opts?: CreateSessionOptions,
) => Effect.Effect<Session, never, Database.Service | Registry.Service | AgentService> = Effect.fn('createSession')(
  function* (opts) {
    // A skill already in a database is bound as-is: it is either space-authored (no registry key at
    // all) or a fork carrying the user's edits, and resolving it through the registry would substitute
    // the pristine copy for the one the caller handed us. Anything else is referenced by its registry
    // URI, so the registry stays the one copy rather than being cloned into the space.
    const skills = (opts?.skills ?? []).map((skill) =>
      Obj.getDatabase(skill) !== undefined ? Ref.make(skill) : Ref.fromURI(Skill.registryURI(Skill.getKey(skill))),
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
    // wanted a bare session; the model is the chat's own, which is where the process reads it from.
    const chat = yield* Database.add(
      Chat.make({ feed: Ref.make(feed), ...(opts?.model ? { session: { model: opts.model } } : {}) }),
    );
    return yield* getSession(chat, { provider: opts?.provider });
  },
  Effect.scoped,
);

export interface Options {
  systemPrompt?: string;

  /**
   * Produces each turn. Defaults to DXOS's own `AiSession`; substituting it swaps the engine while
   * the process keeps ownership of the queue, alarms, redelivery, delegation and hydration.
   */
  makeTurnProducer?: MakeTurnProducer;

  /**
   * Model for a chat that has not selected one (`Chat.session.model` unset).
   */
  defaultModel?: DXN.DXN;

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
   * Process definitions a chat can name in `chat.session.process` to run on instead of
   * {@link AgentProcess}. Read per session, so a definition contributed after the layer was built
   * is still found.
   */
  processes?: () => readonly AgentProcessDefinition[];
}

/**
 * The `AgentService` layer.
 *
 * Requires {@link Process.ManagerService}, which runs a session locally or, for `location: 'edge'`,
 * on the remote runtime. A host without EDGE satisfies its remote half with
 * `RemoteProcessManager.layerNoop`, so an edge session fails at spawn rather than silently running
 * locally.
 */
export const layer = (opts?: Options): Layer.Layer<AgentService, never, Process.ManagerService> =>
  Layer.effect(
    AgentService,
    Effect.gen(function* () {
      const processManager = yield* Process.ManagerService;

      // Spaces an edge session has been opened on this run. One remote runtime spans them all and
      // cannot enumerate them, so this is what `hydrate` has to walk.
      const remoteSpaces = new Set<SpaceId>();

      /**
       * Where a session's agent runs. `edge` needs the space, since one remote runtime spans them,
       * and a chat with no space cannot name where its agent would run.
       */
      const locationFor = (location: AgentLocation | undefined, spaceId: SpaceId | undefined): Process.Location => {
        if (location !== 'edge') {
          return { kind: 'local' };
        }
        if (!spaceId) {
          throw new Error('Agent requested on edge, but its conversation has no space.');
        }
        remoteSpaces.add(spaceId);
        return { kind: 'edge', space: spaceId };
      };

      // The agent's model and steering instructions are bound to its process at spawn time, so the
      // cache tracks what each session was created with. A chat repointed at a different model or
      // instructions ref tears down the old process and spawns a fresh one (see below).
      const sessionCache = new Map<
        string,
        {
          model: string | undefined;
          provider: DXN.DXN | undefined;
          instructions: string | undefined;
          location: AgentLocation;
          process: string;
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

      const makeExecutable = (provider?: DXN.DXN) =>
        AgentProcess({
          systemPrompt: opts?.systemPrompt,
          makeTurnProducer: opts?.makeTurnProducer,
          defaultModel: opts?.defaultModel,
          provider: provider ?? opts?.provider,
          enableToolBackgrounding: opts?.enableToolBackgrounding,
          delegationStrategy: opts?.delegationStrategy,
        });

      /**
       * The process a chat runs on: the one its session names, or ours. A name nothing contributed
       * (its plugin was removed) falls back to ours rather than leaving the chat unable to run.
       */
      const executableFor = (chat: Conversation, provider?: DXN.DXN): AgentProcessDefinition => {
        const key = chat.session?.process;
        if (key === undefined || key === AGENT_PROCESS_KEY) {
          return makeExecutable(provider);
        }
        const definition = opts?.processes?.().find((candidate) => candidate.key === key);
        if (!definition) {
          log.warn('agent process not contributed; running the default', { key });
          return makeExecutable(provider);
        }
        return definition;
      };

      const hydrateAgents = Effect.fnUntraced(function* () {
        // Handles cached before shutdown are suspended and no longer registered with the manager.
        sessionCache.clear();

        // Contributed processes run only locally (see `getSession`), so only ours is looked for on edge.
        const contributed = (opts?.processes?.() ?? []).filter(({ key }) => key !== AGENT_PROCESS_KEY);
        const executable = makeExecutable();
        // Local, plus every space a session has already been opened on this run. A fresh client knows
        // no edge spaces yet and cannot enumerate them (one manager spans them all), but an edge agent
        // does not need the pre-warm: `getSession` reattaches to a process still running for its
        // chat, which is the path opening one takes.
        const agents = [
          ...(yield* processManager.handles({ key: AGENT_PROCESS_KEY })).map((agent) => ({ agent, executable })),
          ...(yield* Effect.forEach(contributed, (definition) =>
            processManager
              .handles({ key: definition.key })
              .pipe(Effect.map((agents) => agents.map((agent) => ({ agent, executable: definition })))),
          )).flat(),
          ...(yield* Effect.forEach([...remoteSpaces], (space) =>
            processManager.handles({ key: AGENT_PROCESS_KEY, location: { kind: 'edge', space } }),
          ))
            .flat()
            .map((agent) => ({ agent, executable })),
        ];
        log('agent hydrate', { count: agents.length });
        for (const { agent, executable } of agents) {
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
                const provider = options?.provider ?? opts?.provider;
                // Read off the chat rather than passed in: the process is bound to the chat, so its
                // model and steering are whatever the chat points at when the process is spawned.
                const model = chat.session?.model;
                const instructions = chat.instructions?.uri;
                const location: AgentLocation = options?.location ?? 'local';
                const executable = executableFor(chat, provider);
                if (location === 'edge' && executable.key !== AGENT_PROCESS_KEY) {
                  // EDGE spawns by key from its own registry, which holds no process a plugin contributed.
                  return yield* Effect.die(
                    new Error(`Agent process ${executable.key} runs only locally, but the chat asked for edge.`),
                  );
                }
                const cached = sessionCache.get(chat.id);
                if (cached) {
                  if (
                    cached.model === model &&
                    cached.provider === provider &&
                    cached.instructions === instructions &&
                    cached.location === location &&
                    cached.process === executable.key &&
                    !Process.isTerminal(cached.handle.status.state)
                  ) {
                    return cached.session;
                  }

                  if (!Process.isTerminal(cached.handle.status.state)) {
                    // Model, provider, steering instructions, location or process changed (e.g. the user
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
                const processLocation = locationFor(options?.location, spaceId);

                // Reuse a still-running process for this feed only when there was no cached session
                // (e.g. after the UI remounted). A process adopted this way re-reads the chat when it
                // hydrates, so it picks up a model selected while this client was away.
                const processes = yield* processManager.handles({
                  target,
                  key: executable.key,
                  location: processLocation,
                });
                let activeProcess = processes.find((process) => !Process.isTerminal(process.status.state));

                let handle: AgentHandle;
                if (activeProcess) {
                  // `hydrate` returns the live handle; the listed one may be a dormant view whose
                  // methods die with "Process not hydrated" (see ProcessManager's DormantHandle).
                  handle = yield* activeProcess.hydrate(executable);
                } else {
                  handle = yield* processManager.spawn(executable, {
                    location: processLocation,
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
                // A process that finished its turn releases its host, so the NEXT prompt on this
                // session has nowhere to land — it is dropped as "input dropped (already finished)"
                // and the conversation silently stops accepting turns. Re-entering `getSession`
                // spawns a fresh process for the same feed (history is replayed from it), which is
                // the path an app already takes when it re-reads the session per prompt.
                const databaseContext = yield* Effect.context<Database.Service>();
                // A REMOTE handle's status is a snapshot the client polls, so a process that finished
                // moments ago still reads as running here — and the host then drops the prompt. What
                // the host actually knows is the manager's `list`. A local handle is the live process
                // itself, so its status is authoritative, and the local `list` reads every persisted
                // process record — a storage round trip per record before every prompt.
                const isFinished: Effect.Effect<boolean> = Effect.suspend(() =>
                  Process.isTerminal(handle.status.state) || location !== 'edge'
                    ? Effect.succeed(Process.isTerminal(handle.status.state))
                    : processManager.handles({ target, key: executable.key, location: processLocation }).pipe(
                        Effect.map((live) => {
                          const current = live.find((process) => process.pid === handle.pid);
                          return current === undefined || Process.isTerminal(current.status.state);
                        }),
                        Effect.orElseSucceed(() => false),
                      ),
                );
                // Releasing the cache first is what keeps this from recursing: `getSession` then
                // takes its spawn path and returns a NEW session whose process is live, so that
                // session's own `submitPrompt` submits directly.
                const resubmit = (prompt: string | ContentBlock.Any[]): Effect.Effect<void> =>
                  Effect.sync(releaseSession).pipe(
                    Effect.andThen(service.getSession(chat, options)),
                    Effect.flatMap((next) => next.submitPrompt(prompt)),
                    Effect.provide(databaseContext),
                  );
                const session = makeSession(handle, chat, feed, releaseSession, isFinished, resubmit);
                sessionCache.set(chat.id, {
                  model,
                  provider,
                  instructions,
                  location,
                  process: executable.key,
                  handle,
                  session,
                });
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
  isFinished: Effect.Effect<boolean>,
  resubmit: (prompt: string | ContentBlock.Any[]) => Effect.Effect<void>,
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
  // Suspended so the state is read per call: a session outlives the process that served its last
  // turn, and submitting to a finished one drops the prompt.
  submitPrompt: (prompt: string | ContentBlock.Any[]) =>
    Effect.flatMap(isFinished, (finished) => (finished ? resubmit(prompt) : process.submitInput(prompt))),
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
