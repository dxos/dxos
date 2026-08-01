//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import { type Database, Obj, Ref } from '@dxos/echo';
import { Outline, Task, TaskSet } from '@dxos/types';

export const DEFAULT_TASK_SET_NAME = 'Untitled task set';

/**
 * Get the outline's task set, creating and linking one on first use.
 *
 * The create path runs to completion synchronously — awaiting before the assignment would let two
 * concurrent conversions each observe an unset ref and link a task set of their own.
 */
export const getOrCreateTaskSet = async (outline: Outline.Outline, db: Database.Database): Promise<TaskSet.TaskSet> => {
  const existing = outline.taskSet;
  if (existing) {
    return existing.load();
  }

  const taskSet = db.add(TaskSet.make({ name: outline.name ?? DEFAULT_TASK_SET_NAME }));
  Obj.update(outline, (outline) => {
    outline.taskSet = Ref.make(taskSet);
  });

  return taskSet;
};

/**
 * Create a task owned by the outline's task set.
 */
export const createTask = async (
  outline: Outline.Outline,
  db: Database.Database,
  title: string,
): Promise<Task.Task> => {
  const taskSet = await getOrCreateTaskSet(outline, db);
  return db.add(Task.make({ title: title.trim(), status: 'todo', taskSet: Ref.make(taskSet) }));
};
