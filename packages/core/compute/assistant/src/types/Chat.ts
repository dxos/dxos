//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Annotation, Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { log } from '@dxos/log';
import { Task } from '@dxos/types';

/**
 * AI chat session.
 */
export class Chat extends Type.makeObject<Chat>(DXN.make('org.dxos.type.assistant.chat', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    viewType: Schema.String.pipe(Schema.optional),

    /** Message feed, owned by the chat so `SetParent` cascades it. */
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),

    /**
     * Instructions steering this conversation, rendered into the system prompt at request time.
     * Held by reference (never copied), so a project's chats follow edits to its instructions.
     */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false))),

    /**
     * The working checklist, flat and ordered. Deliberately NOT an owning (`SetParent`) field: a
     * chat may work on a task that belongs somewhere else — a project's task set delegates one here
     * — and an owning field re-parents every resolved member on each update of the chat, which
     * would silently move that task out of the set that owns it. Tasks the chat itself creates are
     * parented to it explicitly; see {@link addTask}.
     */
    tasks: Schema.Array(Ref.Ref(Task.Task)).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--sparkle--regular',
      hue: 'amber',
    }),
  ),
) {}

/** Module-level alias so callers importing the namespace avoid the doubled `Chat.Chat.fields`. */
export const fields = Chat.fields;

export const make = (
  props: Omit<Obj.MakeProps<typeof Chat>, 'tasks'> & { tasks?: ReadonlyArray<Ref.Ref<Task.Task>> },
): Chat => Obj.make(Chat, { ...props, tasks: props.tasks ?? [] });

/**
 * Refs to the chats accompanying an object, stored on the subject itself (replaces the former
 * `CompanionTo` relation): the annotation is deleted with the subject, and its refs make the
 * parented chats real children — referenced and cascaded — rather than ref-less parent-edge
 * orphans reachable only by index query.
 */
export const CompanionChatAnnotation = Annotation.make({
  id: 'org.dxos.assistant.companionChats',
  schema: Schema.Array(Ref.Ref(Chat)),
});

/**
 * Links a chat to the subject it accompanies (a Project, an Agent, a document, ...): a ref on the
 * subject via {@link CompanionChatAnnotation} plus the ECHO parent edge. Idempotent per chat.
 */
export const linkCompanion = ({ chat, subject }: { chat: Chat; subject: Obj.Unknown }): void => {
  Obj.update(subject, (subject) => {
    const chats = Annotation.get(subject, CompanionChatAnnotation).pipe(
      Option.getOrElse((): readonly Ref.Ref<Chat>[] => []),
    );
    if (!chats.some((ref) => ref.uri === Ref.make(chat).uri)) {
      Annotation.set(subject, CompanionChatAnnotation, [...chats, Ref.make(chat)]);
    }
  });
  Obj.setParent(chat, subject);
};

/** Creates a task the chat owns and appends it to the checklist. */
export const addTask = (
  db: Database.Database,
  chat: Chat,
  title: string,
  props: Partial<Omit<Obj.MakeProps<typeof Task.Task>, 'title'>> = {},
): Task.Task => {
  const task = db.add(Task.make({ title: title.trim(), status: 'todo', ...props }));
  Obj.update(chat, (chat) => {
    chat.tasks = [...chat.tasks, Ref.make(task)];
  });
  // Ownership is decided at creation rather than by membership, so a task the chat made cascades
  // with it while a delegated one keeps the parent it arrived with.
  Obj.setParent(task, chat);
  return task;
};

/**
 * Appends existing tasks to the checklist. Ownership is deliberately untouched — the task keeps the
 * parent it arrived with (contrast {@link addTask}, which parents what the chat creates), so a task
 * borrowed from a project's set stays in that set. Refs already on the checklist are skipped.
 * Returns the refs actually appended.
 */
export const assignTasks = (chat: Chat, tasks: readonly Ref.Ref<Task.Task>[]): Ref.Ref<Task.Task>[] => {
  const added: Ref.Ref<Task.Task>[] = [];
  Obj.update(chat, (chat) => {
    // Matched on entity id rather than target, so an unloaded ref still de-duplicates.
    const present = new Set(chat.tasks.map((ref) => Task.refEntityId(ref)).filter((id) => id !== undefined));
    for (const ref of tasks) {
      const id = Task.refEntityId(ref);
      if (id === undefined || present.has(id)) {
        continue;
      }
      present.add(id);
      added.push(ref);
    }
    chat.tasks = [...chat.tasks, ...added];
  });
  return added;
};

/**
 * Takes tasks off the checklist without destroying them — the inverse of {@link assignTasks}, and
 * distinct from {@link deleteTask}, which also removes the members the chat owns. Returns the refs
 * actually removed.
 */
export const unassignTasks = (chat: Chat, tasks: readonly Ref.Ref<Task.Task>[]): Ref.Ref<Task.Task>[] => {
  const ids = new Set(tasks.map((ref) => Task.refEntityId(ref)).filter((id) => id !== undefined));
  const removed = chat.tasks.filter((ref) => {
    const id = Task.refEntityId(ref);
    return id !== undefined && ids.has(id);
  });
  if (removed.length > 0) {
    Obj.update(chat, (chat) => {
      chat.tasks = chat.tasks.filter((ref) => {
        const id = Task.refEntityId(ref);
        return id === undefined || !ids.has(id);
      });
    });
  }
  return [...removed];
};

/**
 * Remove a task and its sub-tasks from `tasks`, the chat's checklist loaded in full (see
 * {@link loadTasks}) — an unloaded child is invisible to the walk and would be left orphaned in
 * the array. Returns everything dropped from the checklist.
 *
 * Only members the chat owns are destroyed: a delegated task belongs to the set that parents it,
 * so taking it off this checklist must not delete it from there.
 */
export const deleteTask = (
  db: Database.Database,
  chat: Chat,
  tasks: readonly Task.Task[],
  task: Task.Task,
): Task.Task[] => {
  const subtree = Task.subtree(tasks, task);
  const ids = new Set(subtree.map((member) => member.id));
  Obj.update(chat, (chat) => {
    // Matched on the ref's own entity id rather than its target, so an entry whose object is not
    // loaded is still swept.
    chat.tasks = chat.tasks.filter((ref) => {
      const id = Task.refEntityId(ref);
      return id === undefined || !ids.has(id);
    });
  });
  for (const member of subtree) {
    if (Obj.getParent(member)?.id === chat.id) {
      db.remove(member);
    }
  }
  return subtree;
};

/** The chat's feed entity id, readable without resolving the ref. */
export const feedEntityId = (chat: Chat): string | undefined => Task.refEntityId(chat.feed);

/**
 * The chat that owns `feed`. The chat owns its feed (`SetParent`), so the parent edge answers this
 * without a query; the scan is the fallback for a feed whose parent was never stamped.
 */
export const loadForFeed = (feed: Feed.Feed): Effect.Effect<Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const parent = Obj.getParent(feed);
    if (parent && Obj.instanceOf(Chat, parent)) {
      return parent;
    }
    const chats = yield* Database.query(Filter.type(Chat)).run;
    return chats.find((chat) => feedEntityId(chat) === feed.id);
    // A chat-less feed is legitimate (a bare `AiSession`, or a database with the type unregistered),
    // so callers get `undefined` rather than a failure — but a query that actually broke is logged,
    // since it is otherwise indistinguishable from the feed simply having no chat.
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        log.warn('chat lookup failed; treating feed as chat-less', { feed: feed.id, cause: Cause.pretty(cause) });
        return undefined;
      }),
    ),
  );

/** Bound on the parent walk below; a conversation sits one or two edges under its project. */
const MAX_OWNER_DEPTH = 8;

/**
 * The project a conversation belongs to, if any.
 *
 * Walks the parent chain rather than reading the immediate parent, because a chat reaches its project
 * through whatever owns it — directly for a project chat, through the agent for an agent's chat.
 */
export const peekProject = (chat: Chat): Project.Project | undefined => {
  let owner: Obj.Unknown | undefined = Obj.getParent(chat);
  for (let depth = 0; owner && depth < MAX_OWNER_DEPTH; depth++) {
    if (Obj.instanceOf(Project.Project, owner)) {
      return owner;
    }
    owner = Obj.getParent(owner);
  }
  return undefined;
};

/** Loads the checklist in order, de-duplicated: a concurrent merge can land the same ref twice. */
export const loadTasks = (chat: Chat): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* Effect.forEach(chat.tasks, (task) =>
      Database.load(task).pipe(Effect.orElseSucceed(() => undefined)),
    );

    return Task.dedupeById(tasks);
  });

/** Sync twin of {@link loadTasks}; an unresolved ref contributes nothing rather than throwing. */
export const resolveTasks = (chat: Chat): Task.Task[] =>
  Task.dedupeById(chat.tasks.filter((ref) => ref.isAvailable).map((ref) => ref.target));

/** A task is open until it reaches a terminal status. */
export const isOpenTask = (task: Task.Task): boolean => (task.status ?? 'todo') === 'todo' || task.status === 'started';

/**
 * The conversation's tasks rendered as a numbered checklist (the format the planning prompts
 * speak), or a placeholder when none exist. Ordinals match the task list UI, and non-default
 * status/dependencies are noted so the model can reason about readiness.
 */
export const formatChecklist = (chat: Chat): Effect.Effect<string, never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* loadTasks(chat);
    if (tasks.length === 0) {
      return 'No checklist found.';
    }

    return formatTasks(tasks);
  });

/**
 * Renders tasks as `1. [ ] Title` lines, ordinals in checklist order. Status/dependency notes go on
 * their own indented line — appended to the title, models paste them back through title-keyed
 * upserts and duplicate the task.
 */
const formatTasks = (tasks: readonly Task.Task[]): string => {
  const ordinals = new Map(tasks.map((task, index) => [task.id, index + 1]));
  return tasks
    .map((task, index) => {
      const line = `${index + 1}. [${task.status === 'done' ? 'x' : ' '}] ${task.title}`;
      const notes: string[] = [];
      if (task.status && task.status !== 'todo' && task.status !== 'done') {
        notes.push(task.status);
      }

      const deps = (task.dependsOn ?? [])
        .map((ref) => ref.target)
        .filter((target) => target !== undefined)
        .map((target) => ordinals.get(target.id) ?? target.title);
      if (deps.length > 0) {
        notes.push(`depends on ${deps.join(', ')}`);
      }

      return notes.length > 0 ? `${line}\n   (${notes.join('; ')})` : line;
    })
    .join('\n');
};
