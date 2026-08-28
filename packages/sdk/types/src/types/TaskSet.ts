//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
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
  const task = db.add(Task.make({ title: title.trim(), status: 'todo', ...props }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
  return task;
};

/**
 * Delete a task: removed from the set's `tasks` array and from the database. `dependsOn` refs
 * pointing at it are left dangling by design — {@link Task.isTaskReady} reads a dangling dependency as
 * satisfied, matching the file's dangling-ref convention.
 */
export const deleteTask = (db: Database.Database, taskSet: TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = taskSet.tasks.filter((ref) => Task.refId(ref) !== task.id);
  });
  db.remove(task);
};

//
// Set-scoped readers. Membership and order are the arrays; the per-task hierarchy, milestone
// grouping and progress helpers act on a plain task list and live in `Task`.
//

/**
 * The set's tasks in array order, dropping unresolved refs and de-duplicating by id — concurrent
 * edits can merge a ref into the array twice, and a reader must not show the task twice.
 *
 * Synchronous, so it only sees targets already in the working set. A handler on a fresh session
 * (e.g. an MCP worker) must use {@link loadTasks} instead — here every ref of a just-loaded set
 * resolves to `undefined` and the set reads as empty.
 */
export const resolveTasks = (taskSet: TaskSet): Task.Task[] => Task.dedupeById(resolveRefs(taskSet.tasks));

/** The set's milestones in sequence, dropping unresolved refs and de-duplicating by id (see {@link resolveTasks}). */
export const resolveMilestones = (taskSet: TaskSet): Milestone.Milestone[] =>
  Task.dedupeById(resolveRefs(taskSet.milestones));

/**
 * Loads the set's tasks in array order, de-duplicated by id. The async counterpart of
 * {@link resolveTasks}: each ref is loaded through its resolver, so the result is complete on a
 * fresh session. A dangling ref (a member whose object was never persisted or has been removed)
 * is skipped, not an error.
 */
export const loadTasks = (taskSet: TaskSet): Effect.Effect<Task.Task[], never, never> => loadRefs(taskSet.tasks);

/** Loads the set's milestones in sequence, de-duplicated by id (see {@link loadTasks}). */
export const loadMilestones = (taskSet: TaskSet): Effect.Effect<Milestone.Milestone[], never, never> =>
  loadRefs(taskSet.milestones);

const loadRefs = <T extends Obj.Unknown>(refs: ReadonlyArray<Ref.Ref<T>>): Effect.Effect<T[], never, never> =>
  Effect.forEach(refs, (ref) => Database.load(ref).pipe(Effect.orElseSucceed(() => undefined))).pipe(
    Effect.map(Task.dedupeById),
  );

/** `.target` throws on a ref carrying neither an inlined target nor a resolver, so gate on `isAvailable`. */
const resolveRefs = <T extends Obj.Unknown>(refs: ReadonlyArray<Ref.Ref<T>>): Array<T | undefined> =>
  refs.filter((ref) => ref.isAvailable).map((ref) => ref.target);
