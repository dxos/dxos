//
// Copyright 2023 DXOS.org
//

import { type TextObject } from '@dxos/client/echo';

export type Task = {
  id: string;
  done?: boolean;
  title?: string;
  text?: TextObject;
  subTasks?: Task[];
};

export const getParent = (root: Task, task: Task): Task | undefined => {
  for (const subTask of root.subTasks ?? []) {
    if (subTask.id === task.id) {
      return root;
    }

    if (subTask.subTasks) {
      const parent = getParent(subTask, task);
      if (parent) {
        return parent;
      }
    }
  }
};

export const getLast = (root: Task): Task => {
  const last = root.subTasks![root.subTasks!.length - 1];
  if (last.subTasks?.length) {
    return getLast(last);
  }

  return last;
};

export const getPrevious = (root: Task, task: Task): Task | undefined => {
  const parent = getParent(root, task)!;
  const idx = parent.subTasks!.findIndex(({ id }) => id === task.id);
  if (idx > 0) {
    const previous = parent.subTasks![idx - 1];
    if (previous.subTasks?.length) {
      return getLast(previous);
    }

    return previous;
  } else {
    return parent;
  }
};

export const getNext = (root: Task, task: Task, descend = true): Task | undefined => {
  if (task.subTasks?.length && descend) {
    // Go to first child.
    return task.subTasks[0];
  } else {
    const parent = getParent(root, task);
    if (parent) {
      const idx = parent.subTasks!.findIndex(({ id }) => id === task.id);
      if (idx < parent.subTasks!.length - 1) {
        return parent.subTasks![idx + 1];
      } else {
        // Get parent's next sibling.
        return getNext(root, parent, false);
      }
    }
  }
};

export const getSubTasks = (task: Task): Task[] => {
  return (task.subTasks ??= []);
};
