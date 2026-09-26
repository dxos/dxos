//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, type Error, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { type EntityId } from '@dxos/echo/Key';
import { BaseError } from '@dxos/errors';

import * as Milestone from './Milestone.ts';
import * as Task from './Task.ts';

/**
 * Lightweight collection of tasks, native or mirrored from a remote service (e.g. GitHub repos,
 * Linear projects). Sync provenance is carried by `Obj.getMeta` foreign keys, not the type.
 *
 * The set holds a tree: `tasks` lists the ROOT tasks in order, and each task lists its own sub-tasks
 * in `Task.subtasks`. Every list is also its members' ECHO parent (`Annotation.SetParent`), so a
 * task's position in the tree is one record — the list that holds it, which is also the edge
 * `Filter.childOf` follows and deletion cascades along. Milestone assignment stays a single ref on
 * the task (`Task.milestone`).
 */
export class TaskSet extends Type.makeObject<TaskSet>(DXN.make('org.dxos.type.taskSet', '0.4.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotate({ title: 'Image' }), Schema.optional),

    /**
     * The set's root tasks, in order; sub-tasks are listed by their parent (`Task.subtasks`). Claims
     * only an unparented task: a stale entry left by a concurrent move must not pull the task back
     * on the next write to the set, so a move sets the edge itself.
     */
    tasks: Schema.Array(Ref.Ref(Task.Task)).pipe(
      Annotation.FormInputAnnotation.set(false),
      Annotation.SetParent.set({ override: false }),
    ),

    /** The set's milestones, in sequence. */
    milestones: Schema.Array(Ref.Ref(Milestone.Milestone)).pipe(
      Annotation.FormInputAnnotation.set(false),
      Annotation.SetParent.set(),
    ),
  }).pipe(
    Schema.annotate({ title: 'Task Set' }),
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof TaskSet>>, 'tasks' | 'milestones'> & {
    tasks?: ReadonlyArray<Ref.Ref<Task.Task>>;
    milestones?: ReadonlyArray<Ref.Ref<Milestone.Milestone>>;
  } = {},
): TaskSet => Obj.make(TaskSet, { ...props, tasks: props.tasks ?? [], milestones: props.milestones ?? [] });

/** Returns true when value is a TaskSet object. */
export const instanceOf = (value: unknown): value is TaskSet => Obj.instanceOf(TaskSet, value);

/**
 * What lists a task: its set when it is a root, its parent task when it is a sub-task. The holder is
 * also the task's ECHO parent; the edge, not the list, is authoritative when the two disagree.
 */
export type Holder = TaskSet | Task.Task;

/** The ref list a holder orders its tasks in. */
const listOf = (holder: Holder): ReadonlyArray<Ref.Ref<Task.Task>> =>
  instanceOf(holder) ? holder.tasks : (holder.subtasks ?? []);

/**
 * Splice-edits a holder's list inside one `Obj.update`. A task's list is created on first use when a
 * legacy task has none; `Task.make` starts every new task with one, so this is the rare path.
 */
const updateList = (holder: Holder, edit: (refs: Ref.Ref<Task.Task>[]) => void): void => {
  if (instanceOf(holder)) {
    Obj.update(holder, (holder) => edit(holder.tasks));
  } else {
    Obj.update(holder, (holder) => {
      holder.subtasks ??= [];
      edit(holder.subtasks);
    });
  }
};

/** Create a task and file it at the end of `parent`'s sub-tasks, or of the set's roots when omitted. */
export const addTask = (
  db: Database.Database,
  taskSet: TaskSet,
  title: string,
  props: Partial<Omit<Obj.MakeProps<typeof Task.Task>, 'title'>> = {},
  { parent }: { parent?: Task.Task } = {},
): Task.Task => {
  const holder: Holder = parent ?? taskSet;
  const task = Task.make({ [Obj.Parent]: holder, title: title.trim(), status: 'todo', ...props });
  updateList(holder, (refs) => {
    refs.push(Ref.make(task));
  });
  return task;
};

/**
 * Delete a task from its holder's list and the database. The delete cascades along the parent edge,
 * so its sub-tasks go with it; `dependsOn` refs pointing into the subtree dangle by design —
 * `Task.isTaskReady` reads a dangling dependency as satisfied.
 */
export const deleteTask = (db: Database.Database, taskSet: TaskSet, task: Task.Task): void => {
  detach(taskSet, task);
  db.remove(task);
};

//
// Set-scoped readers. The task-level derived views — hierarchy, readiness, milestone grouping,
// progress — take a plain task list rather than a set, so they live in `Task`.
//

/**
 * Every task in the set in tree pre-order — each root followed by its sub-tasks — dropping
 * unresolved refs and de-duplicating by id: concurrent edits can merge a ref into a list twice, and a
 * reader must not show the task twice. An entry whose parent edge names another holder is skipped,
 * so a task appears under exactly one parent.
 */
export const resolveTasks = (taskSet: TaskSet): Task.Task[] => {
  const tasks: Task.Task[] = [];
  const seen = new Set<string>();
  const visit = (holder: Holder): void => {
    for (const task of Task.dedupeById(resolveRefs(listOf(holder)))) {
      if (seen.has(task.id) || !heldBy(holder, task)) {
        continue;
      }
      seen.add(task.id);
      tasks.push(task);
      visit(task);
    }
  };
  visit(taskSet);
  return tasks;
};

/** The set's milestones in sequence, dropping unresolved refs and de-duplicating by id. */
export const resolveMilestones = (taskSet: TaskSet): Milestone.Milestone[] =>
  Task.dedupeById(resolveRefs(taskSet.milestones));

/** `.target` throws on a ref carrying neither an inlined target nor a resolver, so gate on `isAvailable`. */
const resolveRefs = <T extends Obj.Unknown>(refs: ReadonlyArray<Ref.Ref<T>>): Array<T | undefined> =>
  refs.filter((ref) => ref.isAvailable).map((ref) => ref.target);

/**
 * Whether `holder`'s list may show `task`: the parent edge is the one record of where a task lives,
 * so an entry left behind in a second list (two peers moving one task) reads as absent there. A task
 * with no parent edge at all — a legacy entry — is shown by whichever list holds it.
 */
const heldBy = (holder: Holder, task: Task.Task): boolean => {
  const parent = Obj.getParent(task);
  return parent === undefined || parent.id === holder.id;
};

//
// Membership. Every membership write goes through these helpers so the lists (order) and the
// `SetParent`-written parent edges (membership) cannot drift.
//

/**
 * The task set a task belongs to: the set holding the root of its tree. Found through the
 * reverse-ref index first — a legacy root's parent edge may not yet be healed to the set — with the
 * root's ECHO parent as the fallback, for a root whose list entry was dropped (see {@link ensureMember}).
 */
export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const root = yield* Task.collectRoot(task);
    const sets = yield* Database.query(Query.select(Filter.id(root.id)).referencedBy(TaskSet, 'tasks')).run.pipe(
      Effect.orElseSucceed(() => []),
    );
    if (sets[0]) {
      return sets[0];
    }
    const parent = Obj.getParent(root);
    return instanceOf(parent) ? parent : undefined;
  });

/**
 * Whether `task` is a member of `taskSet` — listed in it, or a sub-task somewhere under one of its
 * roots — re-listing it wherever only its ECHO parent edge says it belongs.
 *
 * The two records of membership can disagree: the tree shows `Filter.childOf(holder)`, while a
 * whole-array write merged against a concurrent push drops that entry from the holder's list. The
 * edge is the one that survives, so it wins and the list is healed rather than the task being
 * refused. Healing is per level: a task is re-listed in its parent task's `subtasks`, and the walk
 * continues up to the set.
 */
export const ensureMember = (taskSet: TaskSet, task: Task.Task): boolean => {
  const seen = new Set<string>();
  let current = task;
  while (!seen.has(current.id)) {
    seen.add(current.id);
    const parent = Task.getParentTask(current);
    if (!parent) {
      if (listOf(taskSet).some((ref) => Task.refEntityId(ref) === current.id)) {
        ensureListed(taskSet, current);
        return true;
      }
      if (Obj.getParent(current)?.id !== taskSet.id) {
        return false;
      }
      ensureListed(taskSet, current);
      return true;
    }
    ensureListed(parent, current);
    current = parent;
  }
  return false;
};

/** Lists `task` in `holder` exactly once, collapsing the duplicates two peers healing the same drop leave. */
const ensureListed = (holder: Holder, task: Task.Task): void => {
  const count = listOf(holder).filter((ref) => Task.refEntityId(ref) === task.id).length;
  if (count === 1) {
    return;
  }
  updateList(holder, (refs) => {
    if (count === 0) {
      refs.push(Ref.make(task));
    } else {
      collapseDuplicatesInPlace(refs, task.id);
    }
  });
};

/** The task set a milestone belongs to (see {@link findTaskSet}). */
export const findMilestoneTaskSet = (
  milestone: Milestone.Milestone,
): Effect.Effect<TaskSet | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const sets = yield* Database.query(
      Query.select(Filter.id(milestone.id)).referencedBy(TaskSet, 'milestones'),
    ).run.pipe(Effect.orElseSucceed(() => []));
    return sets[0];
  });

/** File an existing task at the end of `parent`'s sub-tasks, or of the set's roots when omitted. */
export const addTaskToSet = (taskSet: TaskSet, task: Task.Task, { parent }: { parent?: Task.Task } = {}): void => {
  updateList(parent ?? taskSet, (refs) => {
    refs.push(Ref.make(task));
  });
};

/** Put `task` back into `holder`'s list at `index` (clamped), as a delete's undo does. */
export const insertTaskAt = (holder: Holder, task: Task.Task, index: number): void => {
  updateList(holder, (refs) => {
    refs.splice(Math.min(Math.max(index, 0), refs.length), 0, Ref.make(task));
  });
};

/** Append a milestone to the set's sequence. */
export const addMilestoneToSet = (taskSet: TaskSet, milestone: Milestone.Milestone): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.milestones.push(Ref.make(milestone));
  });
};

/**
 * How long one cold ref may take to resolve. An unresolvable ref does not fail — the resolver runs
 * a query that simply finds nothing and waits out its own 30s timeout — so without a bound of our
 * own a single dangling entry stalls the whole read past any caller's deadline. Past this, the
 * entry is treated as gone, which is what an unresolvable ref means to every reader here.
 */
const REF_LOAD_TIMEOUT = Duration.seconds(5);

/**
 * Every ref loaded, dropping entries whose object is gone. The lists may hold cold refs, and the
 * sync `resolveTasks` silently drops those — an incomplete member list here becomes an incomplete
 * subtree sweep or a false membership rejection.
 *
 * Materialized refs are taken from the working set and never hit the resolver, and the cold
 * remainder resolves concurrently: each `Database.load` is a separate indexed query, so resolving a
 * set of any size one ref at a time multiplies a single round trip by the member count.
 */
const loadRefs = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
): Effect.Effect<T[], never, Database.Service> =>
  Effect.forEach(
    refs,
    (ref): Effect.Effect<T | undefined, never, Database.Service> => {
      const target = Database.peek(ref);
      return target
        ? Effect.succeed(target)
        : Database.load(ref).pipe(
            Effect.timeoutOption(REF_LOAD_TIMEOUT),
            Effect.map(Option.getOrUndefined),
            Effect.orElseSucceed(() => undefined),
          );
    },
    { concurrency: REF_LOAD_CONCURRENCY },
  ).pipe(Effect.map((objects) => Task.dedupeById(objects)));

/** Bounded rather than unbounded: a large set must not open one query per member at once. */
const REF_LOAD_CONCURRENCY = 16;

/** Loads every task in the set in tree pre-order, de-duplicated by id (the async {@link resolveTasks}). */
export const loadTasks = (taskSet: TaskSet): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const tasks: Task.Task[] = [];
    const seen = new Set<string>();
    const visit = (holder: Holder): Effect.Effect<void, never, Database.Service> =>
      Effect.gen(function* () {
        for (const task of yield* loadRefs(listOf(holder))) {
          if (seen.has(task.id) || !heldBy(holder, task)) {
            continue;
          }
          seen.add(task.id);
          tasks.push(task);
          yield* visit(task);
        }
      });
    yield* visit(taskSet);
    return tasks;
  });

/** Loads the set's milestones in sequence, de-duplicated by id. */
export const loadMilestones = (taskSet: TaskSet): Effect.Effect<Milestone.Milestone[], never, Database.Service> =>
  loadRefs(taskSet.milestones);

/** Adds the object and flushes, so a set never gains a ref to an object that was not yet stored. */
export const addPersisted = <T extends Obj.Any>(
  obj: T & Database.RejectTypeEntity<T>,
): Effect.Effect<T, never, Database.Service> =>
  Effect.gen(function* () {
    const added = yield* Database.add<T>(obj);
    yield* Database.flush();
    return added;
  });

/**
 * Takes `task` out of the list that holds it — its parent task's `subtasks`, else `taskSet.tasks` —
 * returning the holder and the index it sat at, so an undo can put it back. The set is swept too
 * when the holder is a task: a concurrent move can leave a stale root entry behind.
 */
export const detach = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
): { holder: Holder | undefined; index: number | undefined } => {
  const parent = Task.getParentTask(task);
  const holder: Holder | undefined = parent ?? taskSet;
  const index = holder ? listOf(holder).findIndex((ref) => Task.refEntityId(ref) === task.id) : -1;
  const ids = new Set([task.id]);
  if (holder && index !== -1) {
    updateList(holder, (refs) => removeRefsInPlace(refs, ids));
  }
  if (taskSet && holder?.id !== taskSet.id && listOf(taskSet).some((ref) => Task.refEntityId(ref) === task.id)) {
    updateList(taskSet, (refs) => removeRefsInPlace(refs, ids));
  }
  return { holder, index: index === -1 ? undefined : index };
};

//
// In-place list writes. Every list — `TaskSet.tasks`, `Task.subtasks`, `TaskSet.milestones` — is
// spliced, never reassigned: a whole-array write replaces the list in the CRDT, so merged against a
// concurrent peer's push it drops that entry.
//

/**
 * Remove every ref whose entity id is in `ids`, splicing in place. Matched on the ref's own entity
 * id rather than its target, so an entry whose object is not loaded is still swept.
 */
export const removeRefsInPlace = <T extends Obj.Unknown>(refs: Ref.Ref<T>[], ids: ReadonlySet<string>): void => {
  for (let index = refs.length - 1; index >= 0; index--) {
    const id = Task.refEntityId(refs[index]);
    if (id !== undefined && ids.has(id)) {
      refs.splice(index, 1);
    }
  }
};

/** Keep the first ref for `id` and splice out any later copy. */
export const collapseDuplicatesInPlace = <T extends Obj.Unknown>(refs: Ref.Ref<T>[], id: string): void => {
  const first = refs.findIndex((ref) => Task.refEntityId(ref) === id);
  for (let index = refs.length - 1; index > first; index--) {
    if (Task.refEntityId(refs[index]) === id) {
      refs.splice(index, 1);
    }
  }
};

/**
 * Insert `ref` immediately before `beforeId` (or at the end when unanchored or the anchor is
 * absent), after splicing out any copy already there — so the entry lands exactly once.
 */
export const insertInPlace = <T extends Obj.Unknown>(
  refs: Ref.Ref<T>[],
  ref: Ref.Ref<T>,
  beforeId: EntityId | undefined,
): void => {
  const id = Task.refEntityId(ref);
  if (id !== undefined) {
    removeRefsInPlace(refs, new Set([id]));
  }
  const anchor = beforeId === undefined ? -1 : refs.findIndex((entry) => Task.refEntityId(entry) === beforeId);
  refs.splice(anchor === -1 ? refs.length : anchor, 0, ref);
};

/**
 * Move the ref keyed `id` to sit immediately before `beforeId` (or to the end when unanchored),
 * splicing in place. The same contract as {@link reorderItems}, which the UI uses to predict it.
 */
export const reorderInPlace = <T extends Obj.Unknown>(
  refs: Ref.Ref<T>[],
  id: EntityId,
  beforeId: EntityId | undefined,
): void => {
  if (beforeId === id) {
    return;
  }
  const index = refs.findIndex((ref) => Task.refEntityId(ref) === id);
  if (index === -1) {
    return;
  }
  // Read before the splice: the removed elements it returns are the stored encoding, not refs.
  // Every copy goes, so a duplicate left by concurrent heals collapses to the one being placed.
  insertInPlace(refs, refs[index], beforeId);
};

/**
 * Move the item keyed `id` to sit immediately before `beforeId` (or to the end when unanchored).
 * Returns the array unchanged when the entry is absent, so a concurrent removal is not
 * resurrected. Generic over the item shape so an optimistic UI transform over loaded tasks shares
 * the exact algorithm {@link reorder} applies to the refs array — the two orders must agree.
 */
export const reorderItems = <T>(
  items: ReadonlyArray<T>,
  idOf: (item: T) => string | undefined,
  id: string,
  beforeId: string | undefined,
): T[] => {
  // Anchoring an entry on itself is a no-op; removing it first would strand it at the end.
  if (beforeId === id) {
    return [...items];
  }
  const index = items.findIndex((item) => idOf(item) === id);
  if (index === -1) {
    return [...items];
  }
  const moved = items[index];
  const rest = [...items.slice(0, index), ...items.slice(index + 1)];
  const anchor = beforeId === undefined ? -1 : rest.findIndex((item) => idOf(item) === beforeId);
  if (anchor === -1) {
    return [...rest, moved];
  }
  return [...rest.slice(0, anchor), moved, ...rest.slice(anchor)];
};

/**
 * Move `ref` to sit immediately before `beforeId` in `refs` (or to the end when unanchored).
 * See {@link reorderItems} for the edge-case contract.
 */
export const reorder = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
  id: EntityId,
  beforeId: EntityId | undefined,
): Ref.Ref<T>[] => reorderItems(refs, (ref) => Task.refEntityId(ref), id, beforeId);

/** A parent outside the task's own set (the hierarchy would flatten) or inside its own subtree (a cycle). */
export class InvalidParentTaskError extends BaseError.extend('InvalidParentTaskError', 'Invalid parent task.') {}

/**
 * Load and validate a candidate parent (see {@link InvalidParentTaskError} for the rejections).
 *
 * The cycle check walks the candidate's ancestor chain instead of collecting the task's subtree: it
 * is equivalent (the candidate descends from the task iff the task is one of its ancestors) and,
 * reading each hop off the parent edge, completes without an async boundary once the candidate is
 * materialized, so callers holding materialized objects can run it under `Effect.runSync`.
 */
export const resolveParentTask = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
  parentTask: Ref.Ref<Task.Task>,
): Effect.Effect<Task.Task, InvalidParentTaskError | Error.EntityNotFoundError> =>
  Effect.gen(function* () {
    const candidate = Database.peek(parentTask) ?? (yield* Database.load(parentTask));
    const seen = new Set<string>();
    for (let ancestor: Task.Task | undefined = candidate; ancestor && !seen.has(ancestor.id);) {
      if (ancestor.id === task.id) {
        return yield* Effect.fail(
          new InvalidParentTaskError({ message: 'A task cannot be re-parented under itself or its own sub-tasks.' }),
        );
      }
      seen.add(ancestor.id);
      ancestor = Task.getParentTask(ancestor);
    }
    if (!taskSet || !ensureMember(taskSet, candidate)) {
      return yield* Effect.fail(
        new InvalidParentTaskError({ message: 'The parent task does not belong to this task set.' }),
      );
    }
    return candidate;
  });

/**
 * The whole write half of a move: place the task before `beforeId` among its siblings and, when
 * `parentTask` is given (`null` for a root of the set), move it to that holder's list first —
 * spliced out of the old list and into the new one, with the parent edge following. Validating the
 * placement is the caller's job.
 */
export const moveTask = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
  { parentTask, beforeId }: { parentTask?: Task.Task | null; beforeId?: EntityId },
): void => {
  const current: Holder | undefined = Task.getParentTask(task) ?? taskSet;
  const target: Holder | undefined = parentTask === undefined ? current : (parentTask ?? taskSet);
  if (target && current?.id === target.id && listOf(target).some((ref) => Task.refEntityId(ref) === task.id)) {
    updateList(target, (refs) => reorderInPlace(refs, task.id, beforeId));
    return;
  }

  // The lists claim only unparented tasks, so the edge is moved here rather than by the insert.
  detach(taskSet, task);
  if (target) {
    updateList(target, (refs) => insertInPlace(refs, Ref.make(task), beforeId));
  }
  Obj.setParent(task, target);
};
