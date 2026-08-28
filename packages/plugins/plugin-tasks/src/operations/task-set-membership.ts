//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, EID, type Error, Filter, Obj, Query, Ref } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Milestone, Task, TaskSet } from '@dxos/types';

import { InvalidOperationInput } from '../errors';

/**
 * Membership helpers shared by the task verbs. The set's `tasks`/`milestones` arrays carry order,
 * and every write that adds or removes a member has to touch them; the ECHO parent edge
 * (membership, written by `SetParent` on the arrays) rides along automatically. Keeping the writes
 * in one place is what stops the array and the edges from drifting apart.
 */

/**
 * The task set a task belongs to, found through the reverse-ref index rather than a backref field:
 * membership is stated once, in `TaskSet.tasks`, and a second field on the task could contradict it.
 */
export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet.TaskSet | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const sets = yield* Database.query(
      Query.select(Filter.id(task.id)).referencedBy(TaskSet.TaskSet, 'tasks'),
    ).run.pipe(Effect.orElseSucceed(() => []));
    return sets[0];
  });

/** The task set a milestone belongs to (see {@link findTaskSet}). */
export const findMilestoneTaskSet = (
  milestone: Milestone.Milestone,
): Effect.Effect<TaskSet.TaskSet | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const sets = yield* Database.query(
      Query.select(Filter.id(milestone.id)).referencedBy(TaskSet.TaskSet, 'milestones'),
    ).run.pipe(Effect.orElseSucceed(() => []));
    return sets[0];
  });

/**
 * Add a task to a set. The array write is the whole filing: order from the position, and the
 * parent edge (membership + cascade with the set) from `SetParent` on the field.
 */
export const addTaskToSet = (taskSet: TaskSet.TaskSet, task: Task.Task): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
};

/** Add a milestone to a set, appended to the sequence; `SetParent` on the field parents it. */
export const addMilestoneToSet = (taskSet: TaskSet.TaskSet, milestone: Milestone.Milestone): void => {
  Obj.update(taskSet, (taskSet) => {
    taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];
  });
};

/**
 * Every ref loaded, dropping entries whose object is gone. The arrays may hold cold refs, and the
 * sync `TaskSet.resolveTasks` silently drops those — an incomplete member list here becomes an
 * incomplete subtree sweep or a false membership rejection.
 */
export const loadRefs = <T extends Obj.Unknown>(
  refs: ReadonlyArray<Ref.Ref<T>>,
): Effect.Effect<T[], never, Database.Service> =>
  Effect.forEach(refs, (ref) =>
    Database.load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined))),
  ).pipe(Effect.map((objects) => TaskSet.dedupeById(objects)));

/** Every task in the set, loaded. */
export const loadSetTasks = (taskSet: TaskSet.TaskSet): Effect.Effect<Task.Task[], never, Database.Service> =>
  loadRefs(taskSet.tasks);

/** Every task in `tasks` transitively under `task`, including `task` itself. Cycle-safe. */
export const collectSubtree = (tasks: readonly Task.Task[], task: Task.Task): Task.Task[] => {
  const subtree: Task.Task[] = [];
  const seen = new Set<string>();
  const visit = (current: Task.Task): void => {
    if (seen.has(current.id)) {
      return;
    }
    seen.add(current.id);
    subtree.push(current);
    for (const child of TaskSet.subTasks(tasks, current)) {
      visit(child);
    }
  };
  visit(task);
  return subtree;
};

/**
 * Remove tasks from the set's array. The database cascade deletes the objects themselves along the
 * parent edge, but it cannot know about the array — a ref left behind would read as a dangling
 * entry forever.
 */
export const removeTasksFromSet = (taskSet: TaskSet.TaskSet, taskIds: ReadonlySet<EntityId>): void => {
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
 * Entity id a ref addresses. Read off the URI rather than the target so an unloaded ref still
 * compares, and parsed rather than string-matched because the same object may be addressed
 * locally (`echo:///<id>`) or space-qualified (`echo://<space>/<id>`).
 */
export const refEntityId = <T extends Obj.Unknown>(ref: Ref.Ref<T>): EntityId | undefined => {
  const uri = EID.tryParse(ref.uri);
  return uri ? EID.getEntityId(uri) : undefined;
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

/** Rejects a parent outside the task's own set or inside its own subtree, either of which would orphan it. */
export const resolveParentTask = (
  taskSet: TaskSet.TaskSet | undefined,
  task: Task.Task,
  parentTask: Ref.Ref<Task.Task>,
): Effect.Effect<Task.Task, InvalidOperationInput | Error.EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const candidate = yield* Database.load(parentTask);
    // Loaded, not resolved: a cold ref dropped from the member list would blind the cycle check.
    const members = taskSet ? yield* loadSetTasks(taskSet) : [];
    const subtree = taskSet ? collectSubtree(members, task) : [task];
    if (subtree.some((member) => member.id === candidate.id)) {
      return yield* Effect.fail(
        new InvalidOperationInput({ message: 'A task cannot be re-parented under itself or its own sub-tasks.' }),
      );
    }
    // Membership by the ref's own entity id — no loading, so a cold entry still counts.
    const belongs = taskSet ? taskSet.tasks.some((ref) => refEntityId(ref) === candidate.id) : false;
    if (!belongs) {
      return yield* Effect.fail(
        new InvalidOperationInput({ message: 'The parent task does not belong to this task set.' }),
      );
    }
    return candidate;
  });

/**
 * Writes the hierarchy field. The ECHO parent edge means membership, not hierarchy, so it is
 * re-asserted to the owning set (or cleared for a task in no set) — which also heals a legacy
 * task-parented edge that would otherwise cascade-delete this task with its former parent.
 */
export const applyParentTask = (
  taskSet: TaskSet.TaskSet | undefined,
  task: Task.Task,
  newParent: Task.Task | undefined,
): void => {
  Obj.update(task, (task) => {
    if (newParent) {
      task.parentTask = Ref.make(newParent);
    } else {
      // `delete` rather than assigning undefined: the property is optional rather than nullable, and
      // the self-referential `Schema.suspend` rejects the assignment outright.
      delete task.parentTask;
    }
  });
  Obj.setParent(task, taskSet);
};
