//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteTask> = TaskOperation.DeleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      const subtree = yield* Task.collectSubtree(task);
      const ids = new Set(subtree.map((member) => member.id));
      const taskSet = yield* TaskSet.findTaskSet(task);
      const parentTask = Task.getParentTask(task);

      // Only the task leaves a list: its sub-tasks stay listed in their own parents, which are
      // deleted and restored with them, so an undo needs the one position.
      const { index } = TaskSet.detach(taskSet, task);
      // The delete cascades along the parent edge; the sweep catches a member it already took.
      for (const member of subtree) {
        if (!Obj.isDeleted(member)) {
          yield* Database.remove(member);
        }
      }
      yield* Database.flush();

      return {
        deleted: [...ids],
        restore: {
          entries: subtree.map((member) => (member.id === task.id ? { task: member, index } : { task: member })),
          taskSet,
          parentTask,
        },
      };
    }),
  ),
);

export default handler;
