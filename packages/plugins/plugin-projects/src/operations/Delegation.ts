//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiContext, TrajectoryStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import { Task } from '@dxos/types';

import { findProject } from './find-project.ts';
import { projectContext, renderDelegationBrief } from './task-brief.ts';

//
// Handing tasks to an agent's chat, as far as it needs no app around it: choosing the tasks, filing the chat under
// their project and marking them delegated, and the brief the chat opens with. Shared by the app's delegation and
// by a host that starts the agent itself (EDGE), which supply the agent, the delegator and the first turn.
//

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

/** Who hands the tasks over; the person a delegated task answers to when it has none. */
export type Actor = { identityDid: string; name?: string; role: 'user' };

/**
 * The tasks a delegation hands over: each named task and its unfinished subtree, parent first, minus any an agent
 * already holds. Fails when nothing is left, so a repeated delegation is a no-op rather than a second session.
 */
export const selectTasks = Effect.fnUntraced(function* (taskRefs: readonly Ref.Ref<Task.Task>[]) {
  // A chat delegating nothing has no subject; the operation schemas cannot say so, so the invariant is where an empty
  // list stops.
  invariant(taskRefs.length > 0, 'Expected at least one task to delegate.');
  const requested = yield* Effect.forEach(taskRefs, (taskRef) => Database.load(taskRef));
  // A parent brings its subtasks, deduped so ticking a parent and a child does not list the child twice; a finished
  // subtask comes along only when it was asked for by name.
  const subtrees = yield* Effect.forEach(requested, (task) => Task.collectSubtree(task));
  const asked = new Set(requested.map((task) => task.id));
  const descendants = Task.dedupeById(subtrees.flat()).filter(
    (task) => asked.has(task.id) || !FINISHED.has(task.status ?? 'todo'),
  );
  const tasks = descendants.filter((task) => !Task.isAgentWorking(task));
  invariant(tasks.length > 0, 'Expected at least one task not already delegated.');
  return { requested, tasks };
});

/**
 * Creates the chat the tasks are handed to, on `harness`, filed under the tasks' project, and marks each task
 * started with the chat as its delegate; binds the skills, the project and the tasks' sources to the chat.
 */
export const fileChat = Effect.fnUntraced(function* ({
  requested,
  tasks,
  harness,
  delegator,
  createChat = createChatWithDefaults,
}: {
  requested: readonly Task.Task[];
  tasks: readonly Task.Task[];
  harness: string;
  delegator: Actor | undefined;
  /**
   * Makes the chat, not yet added; by default `AssistantOperation.CreateChat`, which binds the chat's default skills.
   * A host where that operation runs elsewhere (EDGE) passes {@link createBareChat}: an operation's output crosses
   * that boundary as a copy, not the object to file.
   */
  createChat?: (name: string | undefined) => Effect.Effect<Chat.Chat, never, Database.Service | Operation.Service>;
}) {
  const { db } = yield* Database.Service;
  invariant(
    delegator || tasks.every((task) => Task.owner(task) ?? Task.owner(Task.getParentTask(task))),
    'Expected a person to answer for every delegated task.',
  );

  // One chat files under one project, and its brief tells the agent to file its work into that project, so a list
  // spanning two is rejected rather than filed under whichever came first. A task with no project rides along.
  const projects = new Map(
    tasks.flatMap((task) => {
      const project = findProject(task);
      return project ? [[project.id, project] as const] : [];
    }),
  );
  invariant(projects.size <= 1, 'Expected every delegated task to belong to the same project.');
  const [project] = projects.values();

  // Named after the task only when it was handed exactly one: a chat holding three would claim to be about the first.
  const chat = yield* createChat(requested.length === 1 ? requested[0].title : undefined);
  // The tasks join the chat's checklist in the order they were given, which is the agent's working order.
  Obj.update(chat, (chat) => {
    chat.tasks.push(...tasks.map((task) => Ref.make(task)));
  });
  // Parent edge before the add, so the chat files under the project rather than the space root.
  if (project) {
    Chat.linkCompanion({ chat, subject: project });
    // Only the chat's own `instructions` ref reaches the system prompt.
    if (project.instructions) {
      Obj.update(chat, (chat) => {
        chat.instructions = project.instructions;
      });
    }
  }
  Obj.update(chat, (chat) => {
    chat.session = { ...chat.session, harness };
  });
  // A database write rather than `SpaceOperation.AddObject`, so a host that does not run plugin-space still delegates.
  db.add(chat);

  for (const task of tasks) {
    const answering = Task.owner(Task.getParentTask(task)) ?? delegator;
    Task.update(
      task,
      {
        status: 'started',
        delegate: { role: 'assistant', subject: Ref.make(chat) },
        ...(!Task.owner(task) && answering ? { assignee: { ...answering } } : {}),
      },
      { actor: delegator },
    );
  }

  // What a task was made from (an email, a document) is context the agent works from.
  const sources = yield* taskSources(tasks);
  yield* bindDelegationContext(chat, project, sources);
  yield* Database.flush();
  return { chat, project, sources };
});

const createChatWithDefaults = (name: string | undefined) =>
  Operation.invoke(AssistantOperation.CreateChat, { ...(name !== undefined && { name }) }).pipe(
    Effect.map(({ object }) => object),
    Effect.orDie,
  );

/** A chat with its own feed and no default bindings, for an agent that brings its own tools (an external coding agent). */
export const createBareChat = Effect.fnUntraced(function* (name: string | undefined) {
  const { db } = yield* Database.Service;
  const feed = db.add(TrajectoryStore.makeFeed());
  return Chat.make({ ...(name !== undefined && { name }), feed: Ref.make(feed) });
});

/** The opening prompt for an external coding agent: the tasks, the project and its instructions. */
export const brief = Effect.fnUntraced(function* (tasks: readonly Task.Task[], project: Project.Project | undefined) {
  return renderDelegationBrief({ tasks, project, context: project ? yield* projectContext(project) : undefined });
});

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
