//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, type Error, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';
import { type EntityId } from '@dxos/echo/Key';
import { BaseError } from '@dxos/errors';

import * as Milestone from './Milestone';
import * as Task from './Task';

/**
 * Lightweight collection of tasks, native or mirrored from a remote service (e.g. GitHub repos,
 * Linear projects). Sync provenance is carried by `Obj.getMeta` foreign keys, not the type.
 *
 * Membership and order are the `tasks`/`milestones` arrays: `tasks` is flat and holds EVERY task
 * in the set (sub-tasks included), so enumeration never walks a tree, and array order is the
 * canonical order. Hierarchy and milestone assignment are single refs on the task itself
 * (`Task.parentTask`, `Task.milestone`), so moving a task is one field write rather than paired
 * array splices. The set is every member's ECHO parent (`Annotation.SetParent` on both arrays):
 * membership is the parent edge — `Filter.childOf(set)` — while `parentTask` stays app-level, so
 * subtree deletion is the delete verb's job, not a cascade.
 */
export class TaskSet extends Type.makeObject<TaskSet>(DXN.make('org.dxos.type.taskSet', '0.3.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotate({ title: 'Image' }), Schema.optional),

    /** Every task in the set, flat and ordered — sub-tasks included, so enumeration is one read. */
    tasks: Schema.Array(Ref.Ref(Task.Task)).pipe(
      Annotation.FormInputAnnotation.set(false),
      Annotation.SetParent.set(true),
    ),

    /** The set's milestones, in sequence. */
    milestones: Schema.Array(Ref.Ref(Milestone.Milestone)).pipe(
      Annotation.FormInputAnnotation.set(false),
      Annotation.SetParent.set(true),
    ),
  }).pipe(
    Schema.annotate({ title: 'Task Set' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link TaskSet}. */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof TaskSet>>, 'tasks' | 'milestones'> & {
    tasks?: ReadonlyArray<Ref.Ref<Task.Task>>;
    milestones?: ReadonlyArray<Ref.Ref<Milestone.Milestone>>;
  } = {},
): TaskSet => Obj.make(TaskSet, { ...props, tasks: props.tasks ?? [], milestones: props.milestones ?? [] });

/** Returns true when value is a TaskSet object. */
export const instanceOf = (value: unknown): value is TaskSet => Obj.instanceOf(TaskSet, value);

/** Create a task and file it in the set. */
export const addTask = (
  db: Database.Database,
  taskSet: TaskSet,
  title: string,
  props: Partial<Omit<Obj.MakeProps<typeof Task.Task>, 'title'>> = {},
): Task.Task => {
  const task = Task.make({ [Obj.Parent]: taskSet, title: title.trim(), status: 'todo', ...props });
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks.push(Ref.make(task));
  });
  return task;
};

/**
 * Delete a single task from the array and the database. Sub-tasks survive as roots (the DeleteTask
 * verb sweeps subtrees), and `dependsOn` refs pointing at it dangle by design — `Task.isTaskReady`
 * reads a dangling dependency as satisfied.
 */
export const deleteTask = (db: Database.Database, taskSet: TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = taskSet.tasks.filter((ref) => Task.refEntityId(ref) !== task.id);
  });
  db.remove(task);
};

//
// Set-scoped readers. The task-level derived views — hierarchy, readiness, milestone grouping,
// progress — take a plain task list rather than a set, so they live in `Task`.
//

/**
 * The set's tasks in array order, dropping unresolved refs and de-duplicating by id — concurrent
 * edits can merge a ref into the array twice, and a reader must not show the task twice.
 */
export const resolveTasks = (taskSet: TaskSet): Task.Task[] => Task.dedupeById(resolveRefs(taskSet.tasks));

/** The set's milestones in sequence, dropping unresolved refs and de-duplicating by id. */
export const resolveMilestones = (taskSet: TaskSet): Milestone.Milestone[] =>
  Task.dedupeById(resolveRefs(taskSet.milestones));

/** `.target` throws on a ref carrying neither an inlined target nor a resolver, so gate on `isAvailable`. */
const resolveRefs = <T extends Obj.Unknown>(refs: ReadonlyArray<Ref.Ref<T>>): Array<T | undefined> =>
  refs.filter((ref) => ref.isAvailable).map((ref) => ref.target);

//
// Membership. Every membership write goes through these helpers so the arrays (order) and the
// `SetParent`-written parent edges (membership) cannot drift.
//

/**
 * The task set a task belongs to, found through the reverse-ref index rather than `Obj.getParent`:
 * a legacy task's parent edge may not yet be healed to the set, while the `tasks` array always
 * states membership.
 */
export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const sets = yield* Database.query(Query.select(Filter.id(task.id)).referencedBy(TaskSet, 'tasks')).run.pipe(
      Effect.orElseSucceed(() => []),
    );
    return sets[0];
  });

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

/** File an existing task in the set. */
export const addTaskToSet = (taskSet: TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks.push(Ref.make(task));
  });
};

/** Append a milestone to the set's sequence. */
export const addMilestoneToSet = (taskSet: TaskSet, milestone: Milestone.Milestone): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.milestones.push(Ref.make(milestone));
  });
};

/**
 * Every ref loaded, dropping entries whose object is gone. The arrays may hold cold refs, and the
 * sync `resolveTasks` silently drops those — an incomplete member list here becomes an incomplete
 * subtree sweep or a false membership rejection.
 */
const loadRefs = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
): Effect.Effect<T[], never, Database.Service> =>
  Effect.forEach(refs, (ref) => Database.load(ref).pipe(Effect.orElseSucceed(() => undefined))).pipe(
    Effect.map((objects) => Task.dedupeById(objects)),
  );

/** Loads the set's tasks in array order, de-duplicated by id. */
export const loadTasks = (taskSet: TaskSet): Effect.Effect<Task.Task[], never, Database.Service> =>
  loadRefs(taskSet.tasks);

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
 * Remove tasks from the set's array. Deleting the objects is the caller's job — nothing cascades
 * through `parentTask` — and a ref left behind would read as a dangling entry forever.
 */
export const removeTasksFromSet = (taskSet: TaskSet, taskIds: ReadonlySet<EntityId>): void => {
  Obj.update(taskSet, (taskSet) => {
    // Matched on the ref's own entity id rather than its target, so an entry whose object is not
    // loaded is still swept.
    taskSet.tasks = taskSet.tasks.filter((ref) => {
      const id = Task.refEntityId(ref);
      return id === undefined || !taskIds.has(id);
    });
  });
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
 * The cycle check walks the candidate's `parentTask` ancestor chain instead of collecting the
 * task's subtree: it is equivalent (the candidate descends from the task iff the task is one of
 * its ancestors), sees cross-set descendants, and — like {@link Database.load} — completes without
 * an async boundary when every ref on the chain is loaded, so callers holding materialized
 * objects can run it under `Effect.runSync`.
 */
export const resolveParentTask = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
  parentTask: Ref.Ref<Task.Task>,
): Effect.Effect<Task.Task, InvalidParentTaskError | Error.EntityNotFoundError> =>
  Effect.gen(function* () {
    const candidate = yield* Database.load(parentTask);
    const seen = new Set<string>();
    let ancestor: Task.Task | undefined = candidate;
    while (ancestor && !seen.has(ancestor.id)) {
      if (ancestor.id === task.id) {
        return yield* Effect.fail(
          new InvalidParentTaskError({ message: 'A task cannot be re-parented under itself or its own sub-tasks.' }),
        );
      }
      seen.add(ancestor.id);
      ancestor = ancestor.parentTask ? yield* Database.load(ancestor.parentTask) : undefined;
    }
    const belongs = taskSet ? taskSet.tasks.some((ref) => Task.refEntityId(ref) === candidate.id) : false;
    if (!belongs) {
      return yield* Effect.fail(
        new InvalidParentTaskError({ message: 'The parent task does not belong to this task set.' }),
      );
    }
    return candidate;
  });

/**
 * Writes the hierarchy field and re-asserts the ECHO parent edge to the owning set (or clears it),
 * healing a legacy task-parented edge that would otherwise cascade-delete this task with its
 * former parent.
 */
export const applyParentTask = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
  newParent: Task.Task | undefined,
): void => {
  Obj.update(task, (task) => {
    if (newParent) {
      task.parentTask = Ref.make(newParent);
    } else {
      // The self-referential `Schema.suspend` rejects an `undefined` assignment; `delete` is the only clear.
      delete task.parentTask;
    }
  });
  Obj.setParent(task, taskSet);
};

/**
 * The whole write half of a move: reposition the task in the array and, when `parentTask` is
 * given (`null` for a root), re-parent it. Validating the placement is the caller's job.
 */
export const moveTask = (
  taskSet: TaskSet,
  task: Task.Task,
  { parentTask, beforeId }: { parentTask?: Task.Task | null; beforeId?: EntityId },
): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = reorder(taskSet.tasks, task.id, beforeId);
  });
  if (parentTask !== undefined) {
    applyParentTask(taskSet, task, parentTask ?? undefined);
  }
};
