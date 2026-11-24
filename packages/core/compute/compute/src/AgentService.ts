//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Rpc from 'effect/rpc/Rpc';
import type * as Stream from 'effect/Stream';

import type { SessionConfig } from '@dxos/ai';
import type { Database, Feed, Obj, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { DXN, type URI } from '@dxos/keys';
import type { ContentBlock } from '@dxos/types';

import type * as Operation from './Operation.ts';
import type * as Process from './Process.ts';
import type * as Trace from './Trace.ts';
import type * as Trajectory from './trajectory/Trajectory.ts';
import { Instructions } from './types/index.ts';

/**
 * Structural view of the `Chat` object (`@dxos/assistant/Chat`): the durable conversation an agent
 * runs on, carrying its message feed and the instructions steering it. Declared structurally
 * because `@dxos/assistant` sits above this package.
 */
export interface Conversation extends Obj.Unknown {
  readonly feed: Ref.Ref<Feed.Feed>;
  readonly instructions?: Ref.Ref<Instructions.Instructions>;
  /** How the conversation runs (its model); an unset model runs the agent's default. */
  readonly session?: SessionConfig.SessionConfig;
}

/**
 * Service interface for the agent session manager.
 * Implementation lives in @dxos/functions-runtime.
 */
export interface Service {
  /**
   * Gets or creates a session for a chat. The agent process is bound to the chat (its spawn
   * target), reading the feed, the steering instructions and the model from it.
   */
  getSession: (chat: Conversation, options?: GetSessionOptions) => Effect.Effect<Session, never, Database.Service>;

  /**
   * Hydrates agent processes persisted by a previous session.
   * Each record is rehydrated with a fresh process built from the layer options.
   */
  hydrate: () => Effect.Effect<void>;

  /**
   * The session the calling process works for, named by its {@link Process.SessionAnnotation}.
   */
  readonly currentSession: Effect.Effect<Conversation, NoCurrentSessionError, Process.ManagerService | Database.Service>;

  /**
   * The agent the calling process works for, named by its {@link Process.AgentAnnotation}; none for a standalone
   * session.
   */
  readonly currentAgent: Effect.Effect<Option.Option<Obj.Unknown>, never, Process.ManagerService | Database.Service>;

  /**
   * The thread the calling process works for, named by its {@link Process.ThreadAnnotation}; none for work on the
   * session's main thread.
   */
  readonly currentThread: Effect.Effect<Option.Option<Trajectory.ThreadId>, never, Process.ManagerService>;

  /**
   * Enqueues a message into the current session's input queue.
   */
  enqueueMessage: (options: EnqueueMessageOptions) => Effect.Effect<void, NoCurrentSessionError, Process.ManagerService>;

  /**
   * Schedules a self-wake of the current session.
   */
  setAlarm: (options: SetAlarmOptions) => Effect.Effect<void, NoCurrentSessionError, Process.ManagerService>;

  /**
   * Sessions with a live process, found from the annotations of the processes this service manages.
   */
  listSessions: (options?: ListSessionsOptions) => Effect.Effect<readonly URI.URI[], never, Process.ManagerService>;

  /**
   * Agents with a live process, found from the annotations of the processes this service manages.
   */
  listAgents: () => Effect.Effect<readonly URI.URI[], never, Process.ManagerService>;

  /**
   * Spawns a process for agent work, stamped with the session, agent and thread annotations of the caller (or of
   * `options`). Operations spawn through this rather than through {@link Process.ManagerService}.
   */
  spawn: <I, O, Rpcs extends Rpc.Any = never>(
    definition: Operation.Durable<I, O, any, Rpcs>,
    options?: SpawnOptions,
  ) => Effect.Effect<Process.Process<I, O, Rpcs>, never, Process.ManagerService>;

  /**
   * Delegates work to a thread of the current session, to another session of the current agent, or to another
   * agent.
   */
  delegate: (
    request: DelegateRequest,
  ) => Effect.Effect<DelegateResult, NoCurrentSessionError, Process.ManagerService | Database.Service>;
}

/** Raised when the calling process works for no session. */
export class NoCurrentSessionError extends BaseError.extend('NoCurrentSessionError', 'Not running in a session') {}

export interface EnqueueMessageOptions {
  readonly content: readonly ContentBlock.Any[];
}

export interface SetAlarmOptions {
  readonly at: DateTime.DateTime;
  /** Message delivered when the alarm fires. */
  readonly message: string | null;
}

export interface ListSessionsOptions {
  /** Only the sessions of this agent. */
  readonly agent?: URI.URI;
}

export interface SpawnOptions extends Process.SpawnOptions {
  /** The session the process works for; the caller's when absent. */
  readonly session?: URI.URI;
  /** The thread the process works for; the caller's when absent. */
  readonly thread?: Trajectory.ThreadId;
}

/** Where delegated work goes. */
export type DelegationTarget =
  | { readonly kind: 'thread' }
  | { readonly kind: 'session'; readonly session?: URI.URI }
  | { readonly kind: 'agent'; readonly agent: URI.URI };

export interface DelegateRequest {
  readonly target: DelegationTarget;
  /** The base case: a message for the receiver. */
  readonly message?: readonly ContentBlock.Any[];
  /** The richer case: a task assigned to the receiver. */
  readonly task?: Ref.Ref<Obj.Unknown>;
  /** A short title shown to the reader. */
  readonly purpose?: string;
}

export interface DelegateResult {
  /** The thread the work runs in, for thread delegation. */
  readonly thread?: Trajectory.ThreadId;
  /** The session the work runs in, for session delegation. */
  readonly session?: URI.URI;
}

export class AgentService extends Context.Service<AgentService, Service>()('@dxos/functions-runtime/AgentService') {}

/** Re-exported so callers importing this module as a namespace avoid `AgentService.AgentService.key`. */
export const key = AgentService.key;

/**
 * Who a prompt is from, when it is not the session's own reader: the plain-data subset of `Actor`,
 * because the prompt crosses a JSON boundary (a remote process) where a `Ref` cannot be supplied.
 */
export type PromptSender = {
  readonly name?: string;
  readonly identityDid?: string;
  readonly email?: string;
};

export type SubmitPromptOptions = {
  /** Recorded on the appended user message; a named sender is shown to the model as the speaker. */
  readonly sender?: PromptSender;
  /** The fork to send the prompt into; main when absent. */
  readonly thread?: Trajectory.ThreadId;
};

/**
 * Handle to an agent session.
 */
export interface Session {
  /**
   * The chat that the session is associated with.
   */
  readonly chat: Conversation;

  /**
   * The feed carrying the chat's messages.
   */
  readonly feed: Feed.Feed;

  /**
   * Gets the context objects from the agent.
   */
  getContext: () => Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Database.Service>;

  /**
   * Adds context objects to the agent.
   */
  addContext: (context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void, never, Database.Service>;

  /**
   * Submit a turn: a plain user prompt, or pre-built content blocks (e.g. synthetic context + prompt).
   */
  submitPrompt: (prompt: string | ContentBlock.Any[], options?: SubmitPromptOptions) => Effect.Effect<void>;

  /**
   * True while the agent is working on a turn (running, or waiting on a tool call or alarm); false
   * when it is idle awaiting input, or terminal.
   */
  readonly running: Atom.Atom<boolean>;

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
   *
   * When forking a collector from a short-lived parent (e.g. `useEffect` +
   * `runPromise(Effect.forEach(subscribe))`), use {@link Effect.forkDetach} so the
   * stream survives after the parent scope closes; interrupt it on dispose.
   */
  subscribeEphemeral: (options?: Process.SubscribeEphemeralOptions) => Stream.Stream<Trace.Message>;
}

export const getSession = (...args: Parameters<Context.Service.Shape<typeof AgentService>['getSession']>) =>
  AgentService.use((service) => service.getSession(...args));

export const hydrate = (...args: Parameters<Context.Service.Shape<typeof AgentService>['hydrate']>) =>
  AgentService.use((service) => service.hydrate(...args));

/** The session the calling process works for. */
export const currentSession: Effect.Effect<
  Conversation,
  NoCurrentSessionError,
  AgentService | Process.ManagerService | Database.Service
> = Effect.flatMap(AgentService, (service) => service.currentSession);

/** The agent the calling process works for; none for a standalone session. */
export const currentAgent: Effect.Effect<
  Option.Option<Obj.Unknown>,
  never,
  AgentService | Process.ManagerService | Database.Service
> = Effect.flatMap(AgentService, (service) => service.currentAgent);

/** The thread the calling process works for; none for the session's main thread. */
export const currentThread: Effect.Effect<
  Option.Option<Trajectory.ThreadId>,
  never,
  AgentService | Process.ManagerService
> = Effect.flatMap(AgentService, (service) => service.currentThread);

export const enqueueMessage = (
  options: EnqueueMessageOptions,
): Effect.Effect<void, NoCurrentSessionError, AgentService | Process.ManagerService> =>
  Effect.flatMap(AgentService, (service) => service.enqueueMessage(options));

export const setAlarm = (
  options: SetAlarmOptions,
): Effect.Effect<void, NoCurrentSessionError, AgentService | Process.ManagerService> =>
  Effect.flatMap(AgentService, (service) => service.setAlarm(options));

export const spawn = <I, O, Rpcs extends Rpc.Any = never>(
  definition: Operation.Durable<I, O, any, Rpcs>,
  options?: SpawnOptions,
): Effect.Effect<Process.Process<I, O, Rpcs>, never, AgentService | Process.ManagerService> =>
  Effect.flatMap(AgentService, (service) => service.spawn(definition, options));

export const delegate = (
  request: DelegateRequest,
): Effect.Effect<DelegateResult, NoCurrentSessionError, AgentService | Process.ManagerService | Database.Service> =>
  Effect.flatMap(AgentService, (service) => service.delegate(request));

export interface GetSessionOptions {
  // The model is read off the chat (see `Conversation.session`), but the catalog's shared model ids are
  // served by several providers, so the provider must still accompany it into the agent process —
  // the id alone does not identify a resolver.
  readonly provider?: DXN.DXN;
  readonly systemPrompt?: string;
  /**
   * Where the agent runs. `local` executes it in this runtime; `edge` spawns it on the remote host
   * reached through `RemoteProcessManager.Service`, so the conversation continues with the client
   * closed. Read at spawn only, like `model` — moving a live conversation between runtimes would
   * mean handing one process's durable state to another.
   *
   * @default 'local'
   */
  readonly location?: AgentLocation;
  /**
   * Admits the operations the agent and its tool calls invoke that declare requirements
   * (`Process.SpawnOptions.guard`). Bound at spawn, so a session asked for with a different guard
   * runs on a fresh process. A guard is a closure and never reaches an `edge` process.
   */
  readonly guard?: Process.Guard;
}

export type AgentLocation = 'local' | 'edge';
