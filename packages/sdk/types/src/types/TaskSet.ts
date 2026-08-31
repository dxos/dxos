//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, type Database, DXN, EID, Obj, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

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
 * array splices. The ECHO parent edge is still set alongside, but only for deletion cascade.
 */
export class TaskSet extends Type.makeObject<TaskSet>(DXN.make('org.dxos.type.taskSet', '0.3.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotate({ title: 'Image' }), Schema.optional),

    /** Every task in the set, flat and ordered — sub-tasks included, so enumeration is one read. */
    tasks: Schema.Array(Ref.Ref(Task.Task)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** The set's milestones, in sequence. */
    milestones: Schema.Array(Ref.Ref(Milestone.Milestone)).pipe(Annotation.FormInputAnnotation.set(false)),
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

/**
 * Create a task in the set. Membership is the set's `tasks` array; the parent edge is set
 * alongside so the task cascade-deletes with the set.
 */
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
 * Delete a task: removed from the set's `tasks` array and from the database. `dependsOn` refs
 * pointing at it are left dangling by design — {@link isTaskReady} reads a dangling dependency as
 * satisfied, matching the file's dangling-ref convention.
 */
export const deleteTask = (db: Database.Database, taskSet: TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = taskSet.tasks.filter((ref) => refId(ref) !== task.id);
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
 * Entity id a ref points at, read off the URI rather than the target: a ref may address the same
 * object locally (`echo:///<id>`) or space-qualified (`echo://<space>/<id>`), and dereferencing is
 * exactly what these helpers must not require.
 */
const refId = <T extends Obj.Unknown>(ref: Ref.Ref<T> | undefined): string | undefined => {
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
export const parentTaskId = (task: Task.Task): string | undefined => refId(task.parentTask);

/** Tasks with no parent present in the set — a dangling `parentTask` reads as a root, not a ghost. */
export const rootTasks = (tasks: readonly Task.Task[]): Task.Task[] => {
  const present = new Set(tasks.map((task) => task.id));
  return tasks.filter((task) => {
    const parent = refId(task.parentTask);
    return parent === undefined || !present.has(parent);
  });
};

/** Direct sub-tasks of `task`, in the set's canonical order. */
export const subTasks = (tasks: readonly Task.Task[], task: Task.Task): Task.Task[] => {
  const parent = task.id;
  return tasks.filter((candidate) => refId(candidate.parentTask) === parent);
};

/**
 * Whether every `dependsOn` of `task` is `done`, resolved within `tasks` — a dangling dependency
 * ref reads as satisfied, not as a permanent block.
 */
export const isTaskReady = (tasks: readonly Task.Task[], task: Task.Task): boolean => {
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));
  return (task.dependsOn ?? []).every((ref) => {
    const id = refId(ref);
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
      const milestone = refId(cursor.milestone);
      if (milestone !== undefined) {
        found = milestone;
        break;
      }
      const parentId: string | undefined = refId(cursor.parentTask);
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
