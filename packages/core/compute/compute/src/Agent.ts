//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import type * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Rpc from 'effect/rpc/Rpc';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { SessionConfig } from '@dxos/ai';
import { Annotation, Database, DXN, type Error as EchoError, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { IdentityDid, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { ArchivableAnnotation } from '@dxos/schema';
import { type ContentBlock, Task } from '@dxos/types';

import type * as Operation from './Operation.ts';
import type * as Process from './Process.ts';
import type * as Trace from './Trace.ts';
import * as Trajectory from './trajectory/Trajectory.ts';
import * as Instructions from './types/Instructions.ts';
import * as Project from './types/Project.ts';

/**
 * Agents, their sessions, and the service that runs them: `Agent.Agent`, `Agent.Session` and `Agent.Service`.
 */

//
// Session.
//

/**
 * An agent session (formerly `Chat`): the durable conversation a `SessionProcess` runs.
 */
// TODO(dmaretskyi): Rename the DXN to `org.dxos.type.assistant.session`; kept as `chat` so stored sessions still resolve.
export class Session extends Type.makeObject<Session>(DXN.make('org.dxos.type.assistant.chat', '0.2.0'))(
  Schema.Struct({
    /** Display name; named after the first prompt unless the reader sets one. */
    name: Schema.String.pipe(Schema.optional),

    /** How the transcript renders (`normal`, `summary`, `thinking`, `debug`), as the reader last chose; `normal` when unset. */
    viewType: Schema.String.pipe(Schema.optional),

    /**
     * Runs this session's agent on the edge rather than locally, mirroring a trigger's own
     * `remote` flag. When unset, the agent runs locally on the client.
     */
    remote: Schema.Boolean.pipe(Schema.annotate({ title: 'Remote' }), Schema.optional),

    /**
     * Message feed. The session owns a feed nothing else owns, so `SetParent` cascades it; a feed another object
     * already owns (a comment thread's) stays with that owner while the session runs on it.
     */
    feed: Ref.Ref(Feed.Feed).pipe(
      Annotation.SetParent.set({ override: false }),
      Annotation.FormInputAnnotation.set(false),
    ),

    /**
     * Instructions steering this session, rendered into the system prompt at request time.
     * Held by reference (never copied), so a project's sessions follow edits to its instructions.
     */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(Annotation.FormInputAnnotation.set(false))),

    /**
     * How this session runs (its model), chosen in the session rather than globally so it survives
     * a remount and travels with the session. Unset fields fall back to the project's, then the agent's.
     */
    session: Schema.optional(SessionConfig.SessionConfig.pipe(Annotation.FormInputAnnotation.set(false))),

    /**
     * The working checklist, flat and ordered. Deliberately NOT an owning (`SetParent`) field: a
     * session may work on a task that belongs somewhere else — a project's task set delegates one here
     * — and an owning field re-parents every resolved member on each update of the session, which
     * would silently move that task out of the set that owns it. Tasks the session itself creates are
     * parented to it explicitly; see {@link addTask}.
     */
    tasks: Schema.Array(Ref.Ref(Task.Task)).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--sparkle--regular',
      hue: 'amber',
    }),
    Annotation.UserType.set(),
    ArchivableAnnotation.set(true),
  ),
) {}

/** Module-level alias so callers avoid the doubled `Agent.Session.fields`. */
export const sessionFields = Session.fields;

/** Creates a session; its checklist starts empty unless `tasks` is given. */
export const makeSession = (
  props: Omit<Obj.MakeProps<typeof Session>, 'tasks'> & { tasks?: ReadonlyArray<Ref.Ref<Task.Task>> },
): Session => Obj.make(Session, { ...props, tasks: props.tasks ?? [] });

/**
 * Refs to the sessions accompanying an object, stored on the subject itself (replaces the former
 * `CompanionTo` relation): the annotation is deleted with the subject, and its refs make the
 * parented sessions real children — referenced and cascaded — rather than ref-less parent-edge
 * orphans reachable only by index query.
 */
export const CompanionSessionAnnotation = Annotation.make({
  // Stored id; kept so existing companion links still resolve.
  id: 'org.dxos.assistant.companionChats',
  schema: Schema.Array(Ref.Ref(Session)),
});

/**
 * Links a session to the subject it accompanies (a Project, an Agent, a document, ...): a ref on the
 * subject via {@link CompanionSessionAnnotation} plus the ECHO parent edge. Idempotent per session.
 */
export const linkCompanion = ({ session, subject }: { session: Session; subject: Obj.Unknown }): void => {
  const existing = Annotation.get(subject, CompanionSessionAnnotation);
  const sessions = existing.pipe(Option.getOrElse((): readonly Ref.Ref<Session>[] => []));
  if (!sessions.some((ref) => ref.uri === Ref.make(session).uri)) {
    if (Option.isNone(existing)) {
      Obj.update(subject, (subject) => {
        Annotation.set(subject, CompanionSessionAnnotation, [Ref.make(session)]);
      });
    } else {
      // Splice in place so only this ref is appended; Annotation.update validates the result.
      Annotation.update(subject, CompanionSessionAnnotation, (sessions) => {
        sessions.push(Ref.make(session));
      });
    }
  }
  Obj.setParent(session, subject);
};

/**
 * The subject a companion session accompanies: its ECHO parent, when that names the session in
 * {@link CompanionSessionAnnotation}.
 */
export const getCompanionSubject = (session: Session): Obj.Unknown | undefined => {
  const subject = Obj.getParent(session);
  const sessions = subject
    ? Annotation.get(subject, CompanionSessionAnnotation).pipe(Option.getOrElse((): readonly Ref.Ref<Session>[] => []))
    : [];
  return sessions.some((ref) => ref.uri === Ref.make(session).uri) ? subject : undefined;
};

/**
 * Starts a session on a default session config — a project's, say — copied rather than referenced, so
 * a model later picked in the session is the session's own. A session already carrying a config keeps it.
 */
export const seedSession = (session: Session, config: SessionConfig.SessionConfig | undefined): void => {
  if (!config || session.session) {
    return;
  }

  Obj.update(session, (session) => {
    session.session = { ...config };
  });
};

/** Creates a task the session owns and appends it to the checklist. */
export const addTask = (
  session: Session,
  title: string,
  props: Partial<Omit<Obj.MakeProps<typeof Task.Task>, 'title'>> = {},
): Effect.Effect<Task.Task, never, Database.Service> =>
  Effect.gen(function* () {
    // Ownership is decided at creation rather than by membership, so a task the session made cascades
    // with it while a delegated one keeps the parent it arrived with.
    const task = yield* Database.add(
      Task.make({ title: title.trim(), status: 'todo', ...props, [Obj.Parent]: session }),
    );
    Obj.update(session, (session) => {
      session.tasks.push(Ref.make(task));
    });
    return task;
  });

/**
 * Appends existing tasks to the checklist. Ownership is deliberately untouched — the task keeps the
 * parent it arrived with (contrast {@link addTask}, which parents what the session creates), so a task
 * borrowed from a project's set stays in that set. Refs already on the checklist are skipped.
 * Returns the refs actually appended.
 */
export const assignTasks = (session: Session, tasks: readonly Ref.Ref<Task.Task>[]): Ref.Ref<Task.Task>[] => {
  const added: Ref.Ref<Task.Task>[] = [];
  Obj.update(session, (session) => {
    // Matched on entity id rather than target, so an unloaded ref still de-duplicates.
    const present = new Set(session.tasks.map((ref) => Task.refEntityId(ref)).filter((id) => id !== undefined));
    for (const ref of tasks) {
      const id = Task.refEntityId(ref);
      if (id === undefined || present.has(id)) {
        continue;
      }
      present.add(id);
      added.push(ref);
    }
    session.tasks.push(...added);
  });
  return added;
};

/**
 * Takes tasks off the checklist without destroying them — the inverse of {@link assignTasks}, and
 * distinct from {@link deleteTask}, which also removes the members the session owns. Returns the refs
 * actually removed.
 */
export const unassignTasks = (session: Session, tasks: readonly Ref.Ref<Task.Task>[]): Ref.Ref<Task.Task>[] => {
  const ids = new Set(tasks.map((ref) => Task.refEntityId(ref)).filter((id) => id !== undefined));
  const removed = session.tasks.filter((ref) => {
    const id = Task.refEntityId(ref);
    return id !== undefined && ids.has(id);
  });
  if (removed.length > 0) {
    Obj.update(session, (session) => {
      session.tasks = session.tasks.filter((ref) => {
        const id = Task.refEntityId(ref);
        return id === undefined || !ids.has(id);
      });
    });
  }
  return [...removed];
};

/**
 * Remove a task and its sub-tasks from `tasks`, the session's checklist loaded in full (see
 * {@link loadTasks}) — an unloaded child is invisible to the walk and would be left orphaned in
 * the array. Returns everything dropped from the checklist.
 *
 * Only members the session owns are destroyed: a delegated task belongs to the set that parents it,
 * so taking it off this checklist must not delete it from there.
 */
export const deleteTask = (
  session: Session,
  tasks: readonly Task.Task[],
  task: Task.Task,
): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const subtree = Task.subtree(tasks, task);
    const ids = new Set(subtree.map((member) => member.id));
    Obj.update(session, (session) => {
      // Matched on the ref's own entity id rather than its target, so an entry whose object is not
      // loaded is still swept.
      session.tasks = session.tasks.filter((ref) => {
        const id = Task.refEntityId(ref);
        return id === undefined || !ids.has(id);
      });
    });
    for (const member of subtree) {
      if (Obj.getParent(member)?.id === session.id) {
        yield* Database.remove(member);
      }
    }
    return subtree;
  });

/** The session's feed entity id, readable without resolving the ref. */
export const feedEntityId = (session: Session): string | undefined => Task.refEntityId(session.feed);

/**
 * The session that owns `feed`. The session owns its feed (`SetParent`), so the parent edge answers this
 * without a query; the scan is the fallback for a feed whose parent was never stamped.
 */
export const loadSessionForFeed = (feed: Feed.Feed): Effect.Effect<Session | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const parent = Obj.getParent(feed);
    if (parent && Obj.instanceOf(Session, parent)) {
      return parent;
    }
    const sessions = yield* Database.query(Filter.type(Session)).run;
    return sessions.find((session) => feedEntityId(session) === feed.id);
    // A session-less feed is legitimate (a bare `AiSession`, or a database with the type unregistered),
    // so callers get `undefined` rather than a failure — but a query that actually broke is logged,
    // since it is otherwise indistinguishable from the feed simply having no session.
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        log.warn('session lookup failed; treating feed as session-less', {
          feed: feed.id,
          cause: Cause.pretty(cause),
        });
        return undefined;
      }),
    ),
  );

/** Bound on the parent walk below; a session sits one or two edges under its project. */
const MAX_OWNER_DEPTH = 8;

/**
 * The project a session belongs to, if any.
 *
 * Walks the parent chain rather than reading the immediate parent, because a session reaches its project
 * through whatever owns it — directly for a project session, through the agent for an agent's session.
 */
export const peekProject = (session: Session): Project.Project | undefined => {
  let owner: Obj.Unknown | undefined = Obj.getParent(session);
  for (let depth = 0; owner && depth < MAX_OWNER_DEPTH; depth++) {
    if (Obj.instanceOf(Project.Project, owner)) {
      return owner;
    }
    owner = Obj.getParent(owner);
  }
  return undefined;
};

/** Loads the checklist in order, de-duplicated: a concurrent merge can land the same ref twice. */
export const loadTasks = (session: Session): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* Effect.forEach(session.tasks, (task) =>
      Database.load(task).pipe(Effect.orElseSucceed(() => undefined)),
    );

    return Task.dedupeById(tasks);
  });

/** Sync twin of {@link loadTasks}; an unresolved ref contributes nothing rather than throwing. */
export const resolveTasks = (session: Session): Task.Task[] =>
  Task.dedupeById(session.tasks.filter((ref) => ref.isAvailable).map((ref) => ref.target));

/**
 * The session's tasks rendered as a numbered checklist (the format the planning prompts speak; see
 * {@link Task.formatChecklist}), or a placeholder when none exist.
 */
export const formatChecklist = (session: Session): Effect.Effect<string, never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* loadTasks(session);
    if (tasks.length === 0) {
      return 'No checklist found.';
    }

    return Task.formatChecklist(tasks);
  });

//
// Agent.
//

/**
 * An agent identity: a personality (attribution DID) plus its preset payload (instructions with
 * text, skills, objects, and commands). Owns no conversation state — a session is linked to the agent
 * it runs as by the ECHO parent edge (the agent parents its sessions), and durable work products live on a
 * Project.
 */
export class Agent extends Type.makeObject<Agent>(DXN.make('org.dxos.type.agent', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),

    /**
     * Stable identity DID for the agent, used to attribute content it authors (e.g. suggestion
     * branches) as its own author — distinct from any human or other agent. Provisioned
     * externally, never minted by `AgentSetup.makeInitialized` (see the note there); the slot a real
     * HALO identity DID takes once agents get first-class identities. Optional because nothing
     * populates it yet.
     */
    did: Schema.optional(
      // Annotated inside `optional`: the form reads the title from the value schema, not the wrapper.
      IdentityDid.annotate({
        title: 'DID',
        description: "The agent's identity DID; attributes content the agent authors.",
      }),
    ).annotate({
      title: 'DID',
      description: "The agent's DID.",
    }),

    /**
     * Master switch for the agent's automation (propagated onto its compiled routine triggers).
     */
    enabled: Schema.optional(Schema.Boolean).annotate({
      title: 'Enabled',
      description: 'Master switch for agent automation; propagated to all triggers on sync.',
    }),

    /**
     * Instructions for the agent — the preset payload (text, skills, objects, commands) a session
     * receives when the agent is applied to it. Owned: `SetParent` cascades it with the agent.
     */
    instructions: Ref.Ref(Instructions.Instructions).pipe(
      Annotation.SetParent.set(),
      Annotation.FormInlineAnnotation.set(true),
      Schema.annotate({ title: 'Instructions' }),
    ),
    // No `UserType`: agents are managed in space settings, not listed with the space's content.
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--drone--regular', hue: 'amber' }),
  ),
) {}

/**
 * Resolves the agent's instructions and their markdown text.
 */
export const loadInstructions = (
  agent: Agent,
): Effect.Effect<
  { text: string; instructions: Instructions.Instructions },
  EchoError.EntityNotFoundError,
  Database.Service
> =>
  Effect.gen(function* () {
    const instructions = yield* Database.load(agent.instructions);
    const text = yield* Database.load(instructions.text).pipe(
      Effect.map((doc) => doc.content),
      Effect.catchTag('EntityNotFoundError', () => Effect.succeed('')),
    );
    return { text, instructions };
  });

/**
 * Resolves the agent's primary session (the agent holds no session ref): the latest session parented to the
 * agent. Entity ids are ULIDs, so the id order is creation order — `AgentSetup.resetChatHistory` makes the
 * replacement session primary simply by creating it later.
 */
export const loadSession = (agent: Agent): Effect.Effect<Session | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    // A child-of filter rather than a `.children()` traversal: EDGE's query planner has no hierarchy
    // traversal, so an agent hosted there could not resolve its session.
    const sessions = yield* Database.query(Filter.and(Filter.type(Session), Filter.childOf(agent))).run;
    return (
      sessions
        // Sessions bridged from an external conversation (a Discord thread) carry its foreign key; they are
        // the agent's too, but never its own primary session.
        .filter((session) => Obj.getMeta(session).keys.length === 0)
        .sort((left, right) => left.id.localeCompare(right.id))
        .at(-1)
    );
  }).pipe(Effect.orDie);

/**
 * Resolves the agent a session runs as, if any. Plain (agentless) sessions yield `undefined`.
 * The parent is loaded with the object, so this is synchronous — no query.
 */
export const loadForSession = (session: Session): Effect.Effect<Agent | undefined> =>
  Effect.sync(() => {
    const parent = Obj.getParent(session);
    return parent && Obj.instanceOf(Agent, parent) ? parent : undefined;
  });

/**
 * Where a session's turns run: as its `remote` flag says, else on EDGE for an agent's session, since its sessions
 * share the agent's one brain, which only EDGE holds. An explicit `remote: false` keeps an agent's sessions local,
 * for a runtime with no EDGE to reach (a story or test), where every session shares the client's brain instead.
 */
export const sessionLocation = (session: Session): AgentLocation =>
  (session.remote ?? isAgentSession(session)) ? 'edge' : 'local';

/** Whether the session runs as an agent (the agent parents it); synchronous, like {@link loadForSession}. */
export const isAgentSession = (session: Session): boolean => {
  const parent = Obj.getParent(session);
  return parent !== undefined && Obj.instanceOf(Agent, parent);
};

//
// Service.
//

/** Where an agent session runs. */
export type AgentLocation = 'local' | 'edge';

/** A thread of a session: a fork of its trajectory, named by its branch id. */
export const Thread = Trajectory.ThreadId;
export type Thread = Trajectory.ThreadId;

/**
 * Who a prompt is from, when it is not the session's own reader: the plain-data subset of `Actor`,
 * because the prompt crosses a JSON boundary (a remote process) where a `Ref` cannot be supplied.
 */
export type PromptSender = {
  readonly name?: string;
  readonly identityDid?: string;
  readonly email?: string;
};

/** Options for {@link submitPrompt}. */
export type SubmitPromptOptions = {
  /** Recorded on the appended user message; a named sender is shown to the model as the speaker. */
  readonly sender?: PromptSender;
  /** The fork to send the prompt into; main when absent. */
  readonly thread?: Thread;
};

/** Options for {@link open}: how the session's process is spawned. */
export interface OpenSessionOptions {
  // The model is read off the session (see `Session.session`), but the catalog's shared model ids are
  // served by several providers, so the provider must still accompany it into the session process —
  // the id alone does not identify a resolver.
  readonly provider?: DXN.DXN;
  readonly systemPrompt?: string;
  /**
   * Where the session runs. `local` executes it in this runtime; `edge` spawns it on the remote host
   * reached through `RemoteProcessManager.Service`, so the conversation continues with the client
   * closed. Read at spawn only, like `model` — moving a live conversation between runtimes would
   * mean handing one process's durable state to another.
   *
   * @default 'local'
   */
  readonly location?: AgentLocation;
  /**
   * Who the session acts as and the grants it holds (`Process.SpawnOptions.authority`); its tool calls are held to it.
   * Read when the session's process is spawned; a running process keeps the authority it was spawned with.
   */
  readonly authority?: Process.Authority;
}

/** Raised when the calling process works for no session. */
export class NoCurrentSessionError extends BaseError.extend('NoCurrentSessionError', 'Not running in a session') {}

/** Options for {@link enqueueMessage}. */
export interface EnqueueMessageOptions {
  /** The message to enqueue. */
  readonly content: readonly ContentBlock.Any[];
}

/** Options for {@link setAlarm}. */
export interface SetAlarmOptions {
  /** When the alarm fires. */
  readonly at: DateTime.DateTime;
  /** Message delivered when the alarm fires. */
  readonly message: string | null;
}

/** Options for {@link listSessions}. */
export interface ListSessionsOptions {
  /** Only the sessions of this agent. */
  readonly agent?: URI.URI;
}

/** Options for {@link spawn}: process spawn options plus the session and thread the process works for. */
export interface SpawnOptions extends Process.SpawnOptions {
  /** The session the process works for; the caller's when absent. */
  readonly session?: URI.URI;
  /** The thread the process works for; the caller's when absent. */
  readonly thread?: Thread;
}

/** Where delegated work goes. */
export type DelegationTarget =
  | { readonly kind: 'thread' }
  | { readonly kind: 'session'; readonly session?: URI.URI }
  | { readonly kind: 'agent'; readonly agent: URI.URI };

/** What {@link delegate} hands off, and to whom. */
export interface DelegateRequest {
  /** Where the work goes. */
  readonly target: DelegationTarget;
  /** The base case: a message for the receiver. */
  readonly message?: readonly ContentBlock.Any[];
  /** The richer case: a task assigned to the receiver. */
  readonly task?: Ref.Ref<Obj.Unknown>;
  /** A short title shown to the reader. */
  readonly purpose?: string;
}

/** Where delegated work runs, as {@link delegate} reports it. */
export interface DelegateResult {
  /** The thread the work runs in, for thread delegation. */
  readonly thread?: Thread;
  /** The session the work runs in, for session delegation. */
  readonly session?: URI.URI;
}

/**
 * Manages agents and sessions: a global singleton. Implementation lives in `@dxos/agent-runtime`.
 * No member asks its caller for a service: session verbs use the session's database, and the current-process verbs
 * find their caller through {@link Process.CurrentProcess}.
 */
export interface ServiceApi {
  /**
   * Opens a session: gets or spawns the `SessionProcess` bound to it (its spawn target), which reads the
   * feed, the steering instructions and the model from the session.
   */
  open: (session: Session, options?: OpenSessionOptions) => Effect.Effect<void>;

  /**
   * Hydrates session processes persisted by a previous run.
   * Each record is rehydrated with a fresh process built from the layer options.
   */
  hydrate: () => Effect.Effect<void>;

  /** The context objects bound to the session. */
  getContext: (session: Session) => Effect.Effect<Ref.Ref<Obj.Unknown>[]>;

  /** Binds context objects to the session. */
  addContext: (session: Session, context: Ref.Ref<Obj.Unknown>[]) => Effect.Effect<void>;

  /** Submits a turn: a plain user prompt, or pre-built content blocks (e.g. synthetic context + prompt). */
  submitPrompt: (
    session: Session,
    prompt: string | ContentBlock.Any[],
    options?: SubmitPromptOptions,
  ) => Effect.Effect<void>;

  /**
   * True while the session is working on a turn (running, or waiting on a tool call or alarm); false
   * when it is idle awaiting input, or terminal.
   */
  running: (session: Session) => Effect.Effect<Atom.Atom<boolean>>;

  /** Waits until the session has completed its work. */
  waitForCompletion: (session: Session) => Effect.Effect<void>;

  /** Terminates the session's process and clears its durable storage. */
  terminate: (session: Session) => Effect.Effect<void>;

  /**
   * Subscribes to the session's ephemeral trace events (e.g. streaming partial messages): replays
   * buffered events, then streams new ones until the process ends.
   *
   * When forking a collector from a short-lived parent (e.g. `useEffect` +
   * `runPromise(Effect.forEach(subscribe))`), use {@link Effect.forkDetach} so the
   * stream survives after the parent scope closes; interrupt it on dispose.
   */
  subscribeEphemeral: (session: Session, options?: Process.SubscribeEphemeralOptions) => Stream.Stream<Trace.Message>;

  /** The session the calling process works for, named by its {@link Process.SessionAnnotation}. */
  readonly currentSession: Effect.Effect<Session, NoCurrentSessionError>;

  /**
   * The feed the calling process's conversation runs on: its session's, or the bare feed an invocation names (a
   * conversation with no session object).
   */
  readonly currentFeed: Effect.Effect<Feed.Feed, NoCurrentSessionError>;

  /**
   * The agent the calling process works for, named by its {@link Process.AgentAnnotation}; none for a
   * standalone session.
   */
  readonly currentAgent: Effect.Effect<Option.Option<Agent>>;

  /**
   * The thread the calling process works for, named by its {@link Process.ThreadAnnotation}; none for work
   * on the session's main thread.
   */
  readonly currentThread: Effect.Effect<Option.Option<Thread>>;

  /** Enqueues a message into the current session's input queue. */
  enqueueMessage: (options: EnqueueMessageOptions) => Effect.Effect<void, NoCurrentSessionError>;

  /** Schedules a self-wake of the current session. */
  setAlarm: (options: SetAlarmOptions) => Effect.Effect<void, NoCurrentSessionError>;

  /** Sessions with a live process, found from the annotations of the processes this service manages. */
  listSessions: (options?: ListSessionsOptions) => Effect.Effect<readonly URI.URI[]>;

  /** Agents with a live process, found from the annotations of the processes this service manages. */
  listAgents: () => Effect.Effect<readonly URI.URI[]>;

  /**
   * Spawns a process for agent work, stamped with the session, agent and thread annotations of the caller
   * (or of `options`). Operations spawn through this rather than through {@link Process.ManagerService}.
   */
  spawn: <I, O, Rpcs extends Rpc.Any = never>(
    definition: Operation.Durable<I, O, any, Rpcs>,
    options?: SpawnOptions,
  ) => Effect.Effect<Process.Process<I, O, Rpcs>>;

  /**
   * Delegates work to a thread of the current session, to another session of the current agent, or to
   * another agent.
   */
  delegate: (request: DelegateRequest) => Effect.Effect<DelegateResult, NoCurrentSessionError>;

  /** Waits until a thread of the current session has finished, and returns what it answered. */
  waitForThread: (thread: Thread) => Effect.Effect<string, NoCurrentSessionError>;
}

/** The agent service; see {@link ServiceApi}. */
export class Service extends Context.Service<Service, ServiceApi>()('@dxos/compute/Agent/Service') {}

//
// Verbs.
//

/** Opens a session: gets or spawns its process. See {@link ServiceApi.open}. */
export const open = (session: Session, options?: OpenSessionOptions) =>
  Service.use((service) => service.open(session, options));

/** Hydrates session processes persisted by a previous run. */
export const hydrate = () => Service.use((service) => service.hydrate());

/** The context objects bound to the session. */
export const getContext = (session: Session) => Service.use((service) => service.getContext(session));

/** Binds context objects to the session. */
export const addContext = (session: Session, context: Ref.Ref<Obj.Unknown>[]) =>
  Service.use((service) => service.addContext(session, context));

/** Submits a turn to the session: a plain prompt, or pre-built content blocks. */
export const submitPrompt = (session: Session, prompt: string | ContentBlock.Any[], options?: SubmitPromptOptions) =>
  Service.use((service) => service.submitPrompt(session, prompt, options));

/** An atom that is true while the session is working on a turn. */
export const running = (session: Session) => Service.use((service) => service.running(session));

/** Waits until the session has completed its work. */
export const waitForCompletion = (session: Session) => Service.use((service) => service.waitForCompletion(session));

/** Terminates the session's process and clears its durable storage. */
export const terminate = (session: Session) => Service.use((service) => service.terminate(session));

/** Streams the session's ephemeral trace events; see {@link ServiceApi.subscribeEphemeral}. */
export const subscribeEphemeral = (
  session: Session,
  options?: Process.SubscribeEphemeralOptions,
): Stream.Stream<Trace.Message, never, Service> =>
  Stream.unwrap(Effect.map(Service, (service) => service.subscribeEphemeral(session, options)));

/** The session the calling process works for. */
export const currentSession: Effect.Effect<Session, NoCurrentSessionError, Service> = Effect.flatMap(
  Service,
  (service) => service.currentSession,
);

/** The feed the calling process's conversation runs on. */
export const currentFeed: Effect.Effect<Feed.Feed, NoCurrentSessionError, Service> = Effect.flatMap(
  Service,
  (service) => service.currentFeed,
);

/** The agent the calling process works for; none for a standalone session. */
export const currentAgent: Effect.Effect<Option.Option<Agent>, never, Service> = Effect.flatMap(
  Service,
  (service) => service.currentAgent,
);

/** The thread the calling process works for; none for the session's main thread. */
export const currentThread: Effect.Effect<Option.Option<Thread>, never, Service> = Effect.flatMap(
  Service,
  (service) => service.currentThread,
);

/** Enqueues a message into the current session's input queue. */
export const enqueueMessage = (options: EnqueueMessageOptions) =>
  Service.use((service) => service.enqueueMessage(options));

/** Schedules a self-wake of the current session. */
export const setAlarm = (options: SetAlarmOptions) => Service.use((service) => service.setAlarm(options));

/** Sessions with a live process. */
export const listSessions = (options?: ListSessionsOptions) => Service.use((service) => service.listSessions(options));

/** Agents with a live process. */
export const listAgents = () => Service.use((service) => service.listAgents());

/** Spawns a process for agent work, stamped with the caller's session, agent and thread. */
export const spawn = <I, O, Rpcs extends Rpc.Any = never>(
  definition: Operation.Durable<I, O, any, Rpcs>,
  options?: SpawnOptions,
): Effect.Effect<Process.Process<I, O, Rpcs>, never, Service> =>
  Effect.flatMap(Service, (service) => service.spawn(definition, options));

/** Delegates work to a thread, another session of the current agent, or another agent. */
export const delegate = (request: DelegateRequest) => Service.use((service) => service.delegate(request));

/** Waits until a thread of the current session has finished, and returns what it answered. */
export const waitForThread = (thread: Thread) => Service.use((service) => service.waitForThread(thread));
