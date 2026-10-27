//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';

import { SessionConfig } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';
import { Task } from '@dxos/types';
import { concat } from '@dxos/util';

import { ProjectOperation } from '#types';

import { findProject } from './find-project.ts';
import { projectContext, renderDelegationBrief } from './task-brief.ts';

/**
 * Skills the delegated session needs beyond a chat's defaults: the checklist it works from, the
 * ability to write a document, the project verbs that file what it wrote, and a shell for a task
 * that builds or runs something. The project's own skill arrives with the subject binding — a
 * `Project` carries it as an annotation. A key with no plugin behind it binds nothing: the binder
 * drops a ref it cannot resolve.
 */
const DELEGATION_SKILL_KEYS = [
  'org.dxos.skill.planning',
  'org.dxos.skill.markdown',
  'org.dxos.skill.project',
  'org.dxos.skill.sandbox',
];

/** Statuses a subtask keeps when its parent is delegated. */
const FINISHED: ReadonlySet<string> = new Set(['done', 'review', 'cancelled', 'duplicate']);

const handler: Operation.WithHandler<typeof ProjectOperation.DelegateTaskToChat> =
  ProjectOperation.DelegateTaskToChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ tasks: taskRefs, harness: requestedHarness, openCompanion = false }) {
        // A chat delegating nothing has no subject; the schema cannot say so (see the operation's
        // input), so the invariant is where an empty list stops.
        invariant(taskRefs.length > 0, 'Expected at least one task to delegate.');
        const requested = yield* Effect.forEach(taskRefs, (taskRef) => Database.load(taskRef));
        const { db } = yield* Database.Service;

        // A parent brings its subtasks: handing over the heading of a piece of work hands over the work,
        // parent first, then its subtree in order. Deduped, so ticking a parent and a child does not
        // list the child twice.
        const subtrees = yield* Effect.forEach(requested, (task) => Task.collectSubtree(task));

        // A subtask that is already finished stays finished: it comes along only when it was asked for
        // by name, so delegating a parent never reopens work that is done.
        const asked = new Set(requested.map((task) => task.id));
        const descendants = Task.dedupeById(subtrees.flat()).filter(
          (task) => asked.has(task.id) || !FINISHED.has(task.status ?? 'todo'),
        );

        // Idempotent over re-invocation: a task the agent already holds is skipped rather than
        // handed to a second session, and a list of nothing else stops here the way an empty one does.
        const tasks = descendants.filter((task) => !Task.isAgentWorking(task));
        invariant(tasks.length > 0, 'Expected at least one task not already delegated.');

        // The chat is filed under the tasks' project, so it lands in that project's navtree rather
        // than loose in the space. Walked from the tasks rather than taken as input: the list the
        // action runs from knows the tasks and nothing else.
        //
        // One chat can only be filed under one project, and its opening prompt tells the agent to
        // file what it makes into THAT project — so a list spanning two is rejected rather than
        // silently filed under whichever came first. The UI cannot produce one (a checked set comes
        // from a single list), but the operation is a skill verb an agent calls with any refs.
        // A task with no project rides along: nothing about it contradicts the chosen one.
        const projects = new Map(
          tasks.flatMap((task) => {
            const project = findProject(task);
            return project ? [[project.id, project] as const] : [];
          }),
        );
        invariant(projects.size <= 1, 'Expected every delegated task to belong to the same project.');
        const [project] = projects.values();

        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {
          // Named after the task only when it was handed exactly one (with its subtasks): a chat holding
          // three would be claiming to be about whichever happened to be first.
          ...(requested.length === 1 && { name: requested[0].title }),
        });

        // The tasks join the chat's checklist in the order they were given, which is the order the
        // list showed them — the reader's reading order is the agent's working order.
        Obj.update(chat, (chat) => {
          chat.tasks.push(...tasks.map((task) => Ref.make(task)));
        });

        // Parent edge before the add, as the project's own create-chat action does: it files the
        // chat under the project rather than the space root.
        if (project) {
          Chat.linkCompanion({ chat, subject: project });
          Chat.seedSession(chat, project.session);
          // The project's instructions say how its tasks are worked; the binding below brings their skills
          // and context, but only the chat's own `instructions` ref reaches the system prompt.
          if (project.instructions) {
            Obj.update(chat, (chat) => {
              chat.instructions = project.instructions;
            });
          }
        }

        // Every new chat names its agent, so the agent service never has to guess from an unset field.
        const harness = yield* resolveHarness(requestedHarness);
        Obj.update(chat, (chat) => {
          chat.session = { ...chat.session, harness };
        });

        // Added here rather than through `SpaceOperation.AddObject`: this is a database write, and
        // routing it through plugin-space would make the operation unavailable to any host that does
        // not run that plugin.
        db.add(chat);

        // Whoever delegated the work reviews it, so a finished task comes back to them rather than
        // closing itself. `reviewers` being non-empty is what sends the task to `review`.
        const reviewer = yield* currentActor;

        // `started` on delegation, not on completion: the row shows work is underway from the moment
        // the session has it.
        for (const task of tasks) {
          Task.setStatus(task, 'started', { actor: reviewer });
          Obj.update(task, (task) => {
            // The chat's agent holds the work now, so the row says so rather than keeping whoever
            // had it before. Named by the chat, as the planning tool's self-assignment is: a bare
            // role is the supervisor's request to spawn a sub-agent, and its orphan sweep fails a
            // started one no sub-agent is running.
            task.assignee = { role: 'assistant', subject: Ref.make(chat) };
            if (reviewer) {
              task.reviewers = [reviewer];
            }
          });
        }

        // What a task was made from (an email, a document) is context the agent works from, and the
        // object the reader is most likely looking at when they hand the task over.
        const sources = yield* taskSources(tasks);
        yield* bindDelegationContext(chat, project, sources);
        yield* Database.flush();

        // Several tasks leave the chat unnamed, and its opening prompt never passes through the chat
        // UI that names a chat after its first message — so it is named from what it was handed.
        if (!chat.name) {
          yield* Operation.schedule(
            AssistantOperation.UpdateChatName,
            { chat, prompt: requested.map((task) => task.title).join('\n') },
            { spaceId: db.spaceId },
          );
        }

        // The project's companion shows the delegated chat, so opening the Assistant beside the ledger
        // lands on the session holding the tasks rather than on a fresh, empty one. Best-effort like the
        // opening turn below: the delegation is durable either way.
        // The same for each source object, so the companion beside the email a task came from shows the
        // session too — and, when opening the companion, for whatever the reader is looking at, since
        // that is the plank it opens beside.
        const attended = openCompanion ? yield* attendedObjects : [];
        for (const companionTo of [...(project ? [project] : []), ...sources, ...attended]) {
          const selected = yield* Operation.invoke(AssistantOperation.SetCurrentChat, {
            companionTo,
            chat,
          }).pipe(Effect.exit);
          if (Exit.isFailure(selected)) {
            log.warn('delegated chat was not made the companion chat', { cause: Cause.pretty(selected.cause) });
          }
        }
        if (openCompanion) {
          const opened = yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
            subject: Attention.linkedSegment(Assistant.COMPANION_VARIANT),
          }).pipe(Effect.exit);
          if (Exit.isFailure(opened)) {
            log.warn('assistant companion did not open', { cause: Cause.pretty(opened.cause) });
          }
        }

        // The reader stays where they delegated from — the project's ledger, whose pipeline chart
        // shows the session as it starts — so the operation does not navigate (it only selects the
        // companion's chat); the chart's session lane is the way into the chat as a plank.
        //
        // Best-effort and deliberately not fatal: the delegation itself is already durable — the
        // chat exists, carries the task, and is filed under the project — so a host with no agent
        // runtime (a test harness, a headless client) still delegates, and the reader can send the
        // first turn themselves.
        //
        // `Effect.exit`, not `Effect.catch`: a missing service arrives as a DEFECT (the process
        // layers are `orDie`), which a failure channel handler never sees.
        const prompt =
          harness === SessionConfig.COMPOSER_HARNESS
            ? yield* renderOpeningPrompt(tasks)
            : renderDelegationBrief({
                tasks,
                project,
                context: project ? yield* projectContext(project) : undefined,
              });
        // The brief is the system writing on the reader's behalf, so it shows as context rather than as
        // words the reader typed.
        const started = yield* Operation.invoke(AssistantOperation.RunPromptInChat, {
          chat,
          prompt,
          disposition: 'synthetic',
        }).pipe(Effect.exit);
        if (Exit.isFailure(started)) {
          log.warn('delegated chat did not start its turn', { cause: Cause.pretty(started.cause) });
        }

        return { chat };
      }),
    ),
  );

/**
 * Composer's opening prompt: the tasks by address, so the agent starts from them rather than finding
 * them, and fenced to exactly these — a project's other tasks sit one hop away and are not this
 * session's to work. Its first line is all the collapsed brief shows in the chat.
 */
const OPENING_PROMPT = 'You have been assigned the tasks below.';

const SCOPE_PROMPT = concat`
  Work on these tasks only: the project may hold others, and they are not yours, so do not read,
  change, or act on them. Work on your tasks in order. This may require you to read, update, or
  create artifacts associated with the project. Mark each task ready for review as you complete it.
`;

/** Added when the tasks came from objects (an email), which are bound to the chat beside them. */
const SOURCES_PROMPT = concat`
  Each task names the object it was made from. Those objects are bound to this chat, so their
  content is already in your context; address them, and the tasks, by the URIs given here rather than
  exploring the space or building a URI from an id.
`;

/** One line per task: its title, its URI, and the URIs of the objects it was made from. */
const renderOpeningPrompt = Effect.fnUntraced(function* (tasks: readonly Task.Task[]) {
  const entries = yield* Effect.forEach(tasks, (task) =>
    Effect.gen(function* () {
      const sources = yield* Effect.forEach(task.artifacts ?? [], (ref) => Database.load(ref).pipe(Effect.option));
      const uris = sources.flatMap((source) => (Option.isSome(source) ? [Obj.getURI(source.value)] : []));
      const from = uris.length > 0 ? `; made from ${uris.join(', ')}` : '';
      return { line: `- ${JSON.stringify(task.title)}: ${Obj.getURI(task)}${from}`, hasSources: uris.length > 0 };
    }),
  );
  const hasSources = entries.some((entry) => entry.hasSources);
  return [
    OPENING_PROMPT,
    ...entries.map((entry) => entry.line),
    '',
    SCOPE_PROMPT,
    ...(hasSources ? ['', SOURCES_PROMPT] : []),
  ].join('\n');
});

/**
 * The agent the chat runs on: the one asked for, else the person's default agent while it is
 * available on this device, else Composer's own.
 */
const resolveHarness = Effect.fnUntraced(function* (requested: string | undefined) {
  const agents = yield* Capability.getAll(AssistantCapabilities.Agent);
  if (requested) {
    invariant(
      requested === SessionConfig.COMPOSER_HARNESS || agents.some((agent) => agent.id === requested),
      `Unknown agent: ${requested}`,
    );
    return requested;
  }
  const registry = yield* Capability.getOption(Capabilities.AtomRegistry);
  const settings = yield* Capability.getOption(AssistantCapabilities.Settings);
  if (Option.isNone(registry) || Option.isNone(settings)) {
    return SessionConfig.COMPOSER_HARNESS;
  }
  const preferred = registry.value.get(settings.value).defaultAgent;
  const agent = agents.find((agent) => agent.id === preferred);
  return agent && registry.value.get(agent.availability).available ? agent.id : SessionConfig.COMPOSER_HARNESS;
});

/** The delegating identity as an actor, for the reviewer field. */
const currentActor = Effect.gen(function* () {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const identity = client.halo.identity.get();
  if (!identity) {
    return undefined;
  }
  return {
    identityDid: identity.did,
    name: identity.profile?.displayName,
    role: 'user' as const,
  };
}).pipe(Effect.catch(() => Effect.succeed(undefined)));

/**
 * Binds what the session needs onto the chat's feed: the skills, and the project as a context
 * object so the artifact verbs have something to file into.
 *
 * Bound here rather than through `AssistantOperation.BindChatContext`, which would also run every
 * contributed subject-context provider: that operation requires `Registry.Service`, and declaring it
 * makes this one unresolvable on a host that does not provide it.
 */
const bindDelegationContext = Effect.fnUntraced(function* (
  chat: Chat.Chat,
  project: Project.Project | undefined,
  sources: readonly Obj.Unknown[],
) {
  const feed = yield* Database.load(chat.feed);
  const runtime = yield* Effect.context<Database.Service>();
  const binder = new AiContext.Binder({ feed, runtime });
  // Registry refs rather than database clones: the ECHO resolver spans the registry, as
  // `CreateChat` does for the default set. The project's instructions name the skills and context
  // its work needs (a studio project's storyboard verbs, say); the subject binding only renders
  // their text, so those refs are bound too.
  const bindings = project ? yield* projectBindings(project) : { skills: [], objects: [] };
  const skills = [...DELEGATION_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))), ...bindings.skills];
  const objects = [
    ...(project ? [Ref.make(project), ...bindings.objects] : []),
    ...sources.map((source) => Ref.make(source)),
  ];
  yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind({ skills, objects })));
});

/**
 * The objects behind the attended graph nodes and their ancestors (a message open beside its mailbox
 * attends `…/mailbox/message`, and the companion opens on the mailbox plank).
 */
const attendedObjects = Effect.gen(function* () {
  const attention = yield* Capability.getOption(AttentionCapabilities.Attention);
  const appGraph = yield* Capability.getOption(AppCapabilities.AppGraph);
  if (Option.isNone(attention) || Option.isNone(appGraph)) {
    return [];
  }
  const ids = attention.value.getCurrent().flatMap((id) => {
    const segments = id.split('/');
    return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
  });
  const objects = new Map<string, Obj.Unknown>();
  for (const id of ids) {
    const node = AppGraph.getNode(appGraph.value.graph, id);
    if (Option.isSome(node) && Obj.isObject(node.value.data)) {
      objects.set(node.value.data.id, node.value.data);
    }
  }
  return [...objects.values()];
});

/** The objects the tasks record as made from (their `artifacts`), deduped; one that no longer loads is skipped. */
const taskSources = Effect.fnUntraced(function* (tasks: readonly Task.Task[]) {
  const refs = tasks.flatMap((task) => task.artifacts ?? []);
  const loaded = yield* Effect.forEach(refs, (ref) => Database.load(ref).pipe(Effect.option));
  const byId = new Map(loaded.flatMap((object) => (Option.isSome(object) ? [[object.value.id, object.value]] : [])));
  return [...byId.values()];
});

/** `Project.contextBindings` needs the instructions ref resolved, which a fresh load guarantees. */
const projectBindings = Effect.fnUntraced(function* (project: Project.Project) {
  if (project.instructions) {
    yield* Database.load(project.instructions);
  }
  return Project.contextBindings(project);
});

export default handler;
