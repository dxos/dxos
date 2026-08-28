//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteTask> = TaskOperation.DeleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      const taskSet = yield* TaskSet.findTaskSet(task);
      // Loaded, not resolved: a cold ref dropped from the walk would leave its task alive as an
      // orphan after its ancestor is gone.
      const members = taskSet ? yield* TaskSet.loadSetTasks(taskSet) : [];
      const subtree = taskSet ? TaskSet.collectSubtree(members, task) : [task];
      const ids = new Set(subtree.map((member) => member.id));

      if (taskSet) {
        TaskSet.removeTasksFromSet(taskSet, ids);
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
