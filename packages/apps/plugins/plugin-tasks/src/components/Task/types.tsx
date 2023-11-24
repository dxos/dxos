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

export const getPrevious = (root: Task, task: Task): Task | undefined => {
  const parent = getParent(root, task)!;
  const idx = parent.subTasks!.findIndex(({ id }) => id === task.id);
  if (idx > 0) {
    // TODO(burdon): Get last child.
    return parent.subTasks![idx - 1];
  } else {
    return parent;
  }
};

export const getNext = (root: Task, task: Task): Task | undefined => {
  if (task.subTasks?.length) {
    return task.subTasks[0];
  } else {
    const parent = getParent(root, task)!;
    const idx = parent.subTasks!.findIndex(({ id }) => id === task.id);
    if (idx < parent.subTasks!.length - 1) {
      return parent.subTasks![idx + 1];
    } else {
      // TODO(burdon): Get parent's sibling.
      const ancestor = getParent(root, parent);
      if (ancestor) {
        const idx = ancestor.subTasks!.findIndex(({ id }) => id === parent.id);
        if (idx < ancestor.subTasks!.length - 1) {
          return ancestor.subTasks![idx + 1];
        } else {
          console.log('!!');
        }
      }
    }
  }
};

export const getSubTasks = (task: Task): Task[] => {
  return (task.subTasks ??= []);
};
