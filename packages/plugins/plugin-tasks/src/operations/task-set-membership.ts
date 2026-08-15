//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, EID, Filter, Obj, Query, Ref } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { Milestone, Task, TaskSet } from '@dxos/types';

/**
 * Membership helpers shared by the task verbs. The set's `tasks`/`milestones` arrays are the data
 * model, so every write that adds or removes a member has to touch the array; the ECHO parent edge
 * is set alongside purely so deletion cascades. Keeping both in one place is what stops the two
 * from drifting apart.
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
 * Add a task to a set: the array entry (membership and order) plus the lifecycle parent edge — a
 * sub-task hangs off its parent task so it cascades with it, a root task off the set.
 */
export const addTaskToSet = (taskSet: TaskSet.TaskSet, task: Task.Task, parentTask?: Task.Task): void => {
  Obj.setParent(task, parentTask ?? taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
};

/** Add a milestone to a set, appended to the sequence and parented for cascade. */
export const addMilestoneToSet = (taskSet: TaskSet.TaskSet, milestone: Milestone.Milestone): void => {
  Obj.setParent(milestone, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];
  });
};

/** Every task in `taskSet` transitively under `task`, including `task` itself. Cycle-safe. */
export const collectSubtree = (taskSet: TaskSet.TaskSet, task: Task.Task): Task.Task[] => {
  const tasks = TaskSet.resolveTasks(taskSet);
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
