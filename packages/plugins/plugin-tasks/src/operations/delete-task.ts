//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { TaskOperation } from '#types';

import { collectSubtree, findTaskSet, removeTasksFromSet } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteTask> = TaskOperation.DeleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      const taskSet = yield* findTaskSet(task);
      const subtree = taskSet ? collectSubtree(taskSet, task) : [task];
      const ids = new Set(subtree.map((member) => member.id));

      if (taskSet) {
        removeTasksFromSet(taskSet, ids);
      }
      // The whole subtree, explicitly: `parentTask` is app-level, so nothing cascades through it —
      // the ECHO parent edge ties members to their set, not to each other.
      for (const member of subtree) {
        yield* Database.remove(member);
      }
      yield* Database.flush();

      return { deleted: [...ids] };
    }),
  ),
);

export default handler;
