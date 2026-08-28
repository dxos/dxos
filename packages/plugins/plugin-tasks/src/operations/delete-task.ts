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
      // Index-discovered and loading, so a cold or cross-set sub-task cannot escape the sweep.
      const subtree = yield* TaskSet.collectSubtree(task);
      const ids = new Set(subtree.map((member) => member.id));

      // Only the root's own set is swept; a member filed in another set leaves a dangling entry
      // there, which readers tolerate (a dangling ref reads as absent).
      const taskSet = yield* TaskSet.findTaskSet(task);
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
