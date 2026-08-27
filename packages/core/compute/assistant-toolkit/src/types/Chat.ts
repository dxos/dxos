//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type { Harness } from '@dxos/assistant';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Annotation, Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type Task, TaskSet } from '@dxos/types';

import { HarnessContextError } from '../errors';

/**
 * AI chat session.
 */
export class Chat extends Type.makeObject<Chat>(DXN.make('org.dxos.type.assistant.chat', '0.1.0'))(
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
     * Working task set for a standalone chat, created lazily when the first task is recorded.
     * A project chat leaves this unset and files into the project's task set instead — see
     * {@link ensureTaskSet}.
     */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet).pipe(FormInputAnnotation.set(false))),
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

export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

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

/**
 * Returns the conversation's working task set, creating one lazily: a project chat (parented to a
 * project, directly or through its agent) resolves — and if needed creates — the PROJECT's task
 * set, so all of a project's chats file into one ledger; a standalone chat owns its own.
 */
export const ensureTaskSet = (chat: Chat): Effect.Effect<TaskSet.TaskSet, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const project = peekProject(chat);
    if (project) {
      if (project.taskSet) {
        return yield* Database.load(project.taskSet);
      }
      const taskSet = yield* Database.add(TaskSet.make({ name: project.name }));
      Obj.update(project, (project) => {
        project.taskSet = Ref.make(taskSet);
      });
      yield* Database.flush();
      return taskSet;
    }

    if (chat.taskSet) {
      return yield* Database.load(chat.taskSet);
    }

    const taskSet = yield* Database.add(TaskSet.make({ name: chat.name }));
    Obj.update(chat, (chat) => {
      chat.taskSet = Ref.make(taskSet);
    });

    yield* Database.flush();
    return taskSet;
  });

/**
 * Client-side (non-Effect) twin of {@link ensureTaskSet} for UI affordances that already hold the
 * database. Returns undefined when the owner's ref exists but is not loaded yet, rather than
 * risking a duplicate set.
 */
export const ensureTaskSetSync = (db: Database.Database, chat: Chat): TaskSet.TaskSet | undefined => {
  const project = peekProject(chat);
  const ref = project ? project.taskSet : chat.taskSet;
  if (ref) {
    return ref.target;
  }
  const taskSet = db.add(TaskSet.make({ name: project ? project.name : chat.name }));
  if (project) {
    Obj.update(project, (project) => {
      project.taskSet = Ref.make(taskSet);
    });
  } else {
    Obj.update(chat, (chat) => {
      chat.taskSet = Ref.make(taskSet);
    });
  }
  return taskSet;
};

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

/**
 * The conversation's working-task-set ref if one already exists (the parent project's, else the
 * chat's own) — never creates. See {@link ensureTaskSet} for the creating variant.
 */
export const peekTaskSetRef = (chat: Chat): Ref.Ref<TaskSet.TaskSet> | undefined => {
  const project = peekProject(chat);
  return project ? project.taskSet : chat.taskSet;
};

/** The conversation's tasks in the set's canonical order, or empty when no set exists. Never creates. */
export const loadTasks = (chat: Chat): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const ref = peekTaskSetRef(chat);
    const taskSet = ref ? yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)) : undefined;
    if (!taskSet) {
      return [];
    }
    const tasks = yield* Effect.forEach(taskSet.tasks, (task) =>
      Database.load(task).pipe(Effect.orElseSucceed(() => undefined)),
    );
    return TaskSet.dedupeById(tasks);
  });

/** A task is open until it reaches a terminal status. */
export const isOpenTask = (task: Task.Task): boolean => (task.status ?? 'todo') === 'todo' || task.status === 'started';

/**
 * The conversation's tasks rendered as a numbered checklist (the format the planning prompts
 * speak), or a placeholder when none exist. Ordinals match the task list UI, and non-default
 * status/dependencies are noted so the model can reason about readiness. Never creates.
 */
export const formatChecklist = (chat: Chat): Effect.Effect<string, never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* loadTasks(chat);
    if (tasks.length === 0) {
      return 'No checklist found.';
    }
    return renderNumberedChecklist(tasks);
  });

/**
 * Renders tasks as `1. [ ] Title` lines, ordinals in set order. Status/dependency notes go on
 * their own indented line — appended to the title, models paste them back through title-keyed
 * upserts and duplicate the task.
 */
export const renderNumberedChecklist = (tasks: readonly Task.Task[]): string => {
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

/**
 * Resolves the bound session {@link Chat} for the current conversation.
 * Planning and other session-scoped tools require exactly one chat in harness context.
 */
export const getFromContext: Effect.Effect<
  Chat,
  HarnessContextError | Harness.NotSupportedError,
  Harness.HarnessService
> = Effect.gen(function* () {
  // Loaded here rather than imported: `@dxos/assistant` pulls the AI session runtime (MCP SDK,
  // Anthropic client, ~280 KB), and this module carries the Chat *schema*, which core plugins
  // reference for their operation definitions.
  const { Harness: HarnessRuntime } = yield* Effect.promise(() => import('@dxos/assistant'));
  const chats = yield* HarnessRuntime.queryContext(Filter.type(Chat));
  if (chats.length !== 1) {
    return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
  }

  return chats[0];
});
