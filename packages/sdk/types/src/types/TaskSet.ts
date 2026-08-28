//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, EID, type Error, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
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
  const task = db.add(Task.make({ title: title.trim(), status: 'todo', ...props }));
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
  return task;
};

/**
 * Delete a single task from the array and the database. Sub-tasks survive as roots (the DeleteTask
 * verb sweeps subtrees), and `dependsOn` refs pointing at it dangle by design — {@link isTaskReady}
 * reads a dangling dependency as satisfied.
 */
export const deleteTask = (db: Database.Database, taskSet: TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = taskSet.tasks.filter((ref) => refEntityId(ref) !== task.id);
  });
  db.remove(task);
};

//
// Derived views. Nothing below is stored: hierarchy, milestone grouping, and progress are all
// computed from the flat `tasks` array plus the per-task refs, so the two can never disagree.
//
// Relationships are compared by ref URI rather than by dereferencing, so the same helpers serve a
// live database and a React snapshot (whose refs carry no resolver and whose `.target` is
// undefined). Each takes an already-resolved task list — `resolveTasks` in a handler, refs resolved
// through their own atoms in a component.
//

/**
 * Entity id a ref points at, read off the URI rather than the target so an unloaded ref still
 * compares, and parsed rather than string-matched: a ref may address the same object locally
 * (`echo:///<id>`) or space-qualified (`echo://<space>/<id>`).
 */
export const refEntityId = <T extends Obj.Unknown>(ref: Ref.Ref<T> | undefined): EntityId | undefined => {
  if (!ref) {
    return undefined;
  }
  const eid = EID.tryParse(ref.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

/**
 * The set's tasks in array order, dropping unresolved refs and de-duplicating by id — concurrent
 * edits can merge a ref into the array twice, and a reader must not show the task twice.
 */
export const resolveTasks = (taskSet: TaskSet): Task.Task[] => dedupeById(resolveRefs(taskSet.tasks));

/** The set's milestones in sequence, dropping unresolved refs and de-duplicating by id. */
export const resolveMilestones = (taskSet: TaskSet): Milestone.Milestone[] =>
  dedupeById(resolveRefs(taskSet.milestones));

/** `.target` throws on a ref carrying neither an inlined target nor a resolver, so gate on `isAvailable`. */
const resolveRefs = <T extends Obj.Unknown>(refs: ReadonlyArray<Ref.Ref<T>>): Array<T | undefined> =>
  refs.filter((ref) => ref.isAvailable).map((ref) => ref.target);

/**
 * Drops unresolved entries and de-duplicates by id. Exported because a React caller resolves the
 * arrays through per-ref atoms and still needs the same cleanup.
 */
export const dedupeById = <T extends Obj.Unknown>(objects: ReadonlyArray<T | undefined>): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const object of objects) {
    if (!object || seen.has(object.id)) {
      continue;
    }
    seen.add(object.id);
    result.push(object);
  }
  return result;
};

/** Entity id of a task's parent, exported so a caller walking the tree shares this module's ref-uri parse. */
export const parentTaskId = (task: Task.Task): string | undefined => refEntityId(task.parentTask);

/**
 * Order query-loaded tasks by the set's `tasks` array — canonical order; a query returns none. A
 * task the array does not list yet (a concurrent add observed mid-write) sorts to the end.
 */
export const orderTasks = (tasks: ReadonlyArray<Task.Task>, refs: ReadonlyArray<Ref.Ref<Task.Task>>): Task.Task[] => {
  const position = new Map<string, number>();
  refs.forEach((ref, index) => {
    const id = refEntityId(ref);
    if (id !== undefined && !position.has(id)) {
      position.set(id, index);
    }
  });
  return [...tasks].sort(
    (a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
};

/** Tasks with no parent present in the set — a dangling `parentTask` reads as a root, not a ghost. */
export const rootTasks = (tasks: readonly Task.Task[]): Task.Task[] => {
  const present = new Set(tasks.map((task) => task.id));
  return tasks.filter((task) => {
    const parent = refEntityId(task.parentTask);
    return parent === undefined || !present.has(parent);
  });
};

/** Direct sub-tasks of `task`, in the set's canonical order. */
export const subTasks = (tasks: readonly Task.Task[], task: Task.Task): Task.Task[] => {
  const parent = task.id;
  return tasks.filter((candidate) => refEntityId(candidate.parentTask) === parent);
};

/**
 * Whether every `dependsOn` of `task` is `done`, resolved within `tasks` — a dangling dependency
 * ref reads as satisfied, not as a permanent block.
 */
export const isTaskReady = (tasks: readonly Task.Task[], task: Task.Task): boolean => {
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));
  return (task.dependsOn ?? []).every((ref) => {
    const id = refEntityId(ref);
    const dep = id === undefined ? undefined : byId.get(id);
    return !dep || dep.status === 'done';
  });
};

/**
 * The milestone a task is shown under: its own, else the nearest ancestor's (Linear's behavior),
 * as an entity id. Undefined for a backlog task. Walks within `tasks`, so it needs no
 * dereferencing, and is cycle-safe against a malformed `parentTask` loop.
 */
export const effectiveMilestoneId = (tasks: readonly Task.Task[], task: Task.Task): string | undefined =>
  effectiveMilestoneIds(tasks).get(task.id);

/**
 * Every task's effective milestone in one pass, keyed by task id — the per-task walk is otherwise
 * quadratic when grouping a whole set. Exported so a caller filtering the whole set builds it once.
 * Tasks with no milestone anywhere up their chain map to `undefined`, memoized like any other result
 * so a long backlog chain is still walked once.
 */
export const effectiveMilestoneIds = (tasks: readonly Task.Task[]): Map<string, string | undefined> => {
  const byId = new Map(tasks.map((task) => [task.id, task] as const));
  const resolved = new Map<string, string | undefined>();

  for (const task of tasks) {
    // Walk to the nearest ancestor carrying a milestone, remembering the path so the whole chain
    // is filled in at once; `visited` also terminates a malformed `parentTask` cycle.
    const path: string[] = [];
    const visited = new Set<string>();
    let cursor: Task.Task | undefined = task;
    let found: string | undefined;

    while (cursor) {
      const cursorId = cursor.id;
      if (visited.has(cursorId)) {
        break;
      }
      visited.add(cursorId);
      if (resolved.has(cursorId)) {
        found = resolved.get(cursorId);
        break;
      }
      path.push(cursorId);
      const milestone = refEntityId(cursor.milestone);
      if (milestone !== undefined) {
        found = milestone;
        break;
      }
      const parentId: string | undefined = refEntityId(cursor.parentTask);
      cursor = parentId === undefined ? undefined : byId.get(parentId);
    }

    for (const id of path) {
      resolved.set(id, found);
    }
  }

  return resolved;
};

/** Tasks belonging to a milestone (by {@link effectiveMilestoneId}), in the set's canonical order. */
export const tasksForMilestone = (tasks: readonly Task.Task[], milestone: Milestone.Milestone): Task.Task[] => {
  const target = milestone.id;
  const milestoneIds = effectiveMilestoneIds(tasks);
  return tasks.filter((task) => milestoneIds.get(task.id) === target);
};

/** Tasks under no milestone — the backlog. */
export const backlogTasks = (tasks: readonly Task.Task[]): Task.Task[] => {
  const milestoneIds = effectiveMilestoneIds(tasks);
  return tasks.filter((task) => milestoneIds.get(task.id) === undefined);
};

export type Progress = {
  /** Tasks counted toward the milestone, i.e. excluding cancelled ones. */
  total: number;
  done: number;
  /** Fraction in [0, 1]; 0 for a milestone with nothing to do. */
  ratio: number;
};

/**
 * A milestone's progress, derived from its tasks — a milestone stores no status of its own, so
 * "met" is simply `ratio === 1`. Cancelled tasks leave the denominator (they are not work owed).
 */
export const milestoneProgress = (tasks: readonly Task.Task[], milestone: Milestone.Milestone): Progress => {
  const counted = tasksForMilestone(tasks, milestone).filter((task) => task.status !== 'cancelled');
  const done = counted.filter((task) => task.status === 'done').length;
  return { total: counted.length, done, ratio: counted.length === 0 ? 0 : done / counted.length };
};

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
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
};

/** Append a milestone to the set's sequence. */
export const addMilestoneToSet = (taskSet: TaskSet, milestone: Milestone.Milestone): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];
  });
};

/**
 * Every ref loaded, dropping entries whose object is gone. The arrays may hold cold refs, and the
 * sync `resolveTasks` silently drops those — an incomplete member list here becomes an incomplete
 * subtree sweep or a false membership rejection.
 */
export const loadRefs = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
): Effect.Effect<T[], never, Database.Service> =>
  Effect.forEach(refs, (ref) =>
    Database.load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined))),
  ).pipe(Effect.map((objects) => dedupeById(objects)));

/** Every task in the set, loaded. */
export const loadSetTasks = (taskSet: TaskSet): Effect.Effect<Task.Task[], never, Database.Service> =>
  loadRefs(taskSet.tasks);

/**
 * Every task transitively under `task` (via `parentTask`), including `task` itself. Children are
 * discovered through the reverse-ref index — space-wide, loading each as it is found — rather
 * than any one set's array, since a sub-task may be filed in a different set (or none). Cycle-safe.
 */
export const collectSubtree = (task: Task.Task): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const subtree: Task.Task[] = [];
    const seen = new Set<string>();
    const queue: Task.Task[] = [task];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current.id)) {
        continue;
      }
      seen.add(current.id);
      subtree.push(current);
      const children = yield* Database.query(
        Query.select(Filter.id(current.id)).referencedBy(Task.Task, 'parentTask'),
      ).run.pipe(Effect.orElseSucceed(() => []));
      queue.push(...children);
    }
    return subtree;
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
      const id = refEntityId(ref);
      return id === undefined || !taskIds.has(id);
    });
  });
};

/**
 * Move `ref` to sit immediately before `beforeId` in `refs` (or to the end when unanchored).
 * Returns the array unchanged when the entry is absent, so a concurrent removal is not resurrected.
 */
export const reorder = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
  id: EntityId,
  beforeId: EntityId | undefined,
): Ref.Ref<T>[] => {
  // Anchoring an entry on itself is a no-op; removing it first would strand it at the end.
  if (beforeId === id) {
    return [...refs];
  }
  const index = refs.findIndex((ref) => refEntityId(ref) === id);
  if (index === -1) {
    return [...refs];
  }
  const moved = refs[index];
  const rest = [...refs.slice(0, index), ...refs.slice(index + 1)];
  const anchor = beforeId === undefined ? -1 : rest.findIndex((ref) => refEntityId(ref) === beforeId);
  if (anchor === -1) {
    return [...rest, moved];
  }
  return [...rest.slice(0, anchor), moved, ...rest.slice(anchor)];
};

/** A parent outside the task's own set (the hierarchy would flatten) or inside its own subtree (a cycle). */
export class InvalidParentTaskError extends BaseError.extend('InvalidParentTaskError', 'Invalid parent task.') {}

/** Load and validate a candidate parent (see {@link InvalidParentTaskError} for the rejections). */
export const resolveParentTask = (
  taskSet: TaskSet | undefined,
  task: Task.Task,
  parentTask: Ref.Ref<Task.Task>,
): Effect.Effect<Task.Task, InvalidParentTaskError | Error.EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const candidate = yield* Database.load(parentTask);
    const subtree = yield* collectSubtree(task);
    if (subtree.some((member) => member.id === candidate.id)) {
      return yield* Effect.fail(
        new InvalidParentTaskError({ message: 'A task cannot be re-parented under itself or its own sub-tasks.' }),
      );
    }
    const belongs = taskSet ? taskSet.tasks.some((ref) => refEntityId(ref) === candidate.id) : false;
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
