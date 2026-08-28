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

      // Sweep every owning set's array — a sub-task may be filed in a different set than its
      // ancestor, and its entry there would otherwise dangle forever.
      const owners = new Map<string, TaskSet.TaskSet>();
      for (const member of subtree) {
        const owner = yield* TaskSet.findTaskSet(member);
        if (owner) {
          owners.set(owner.id, owner);
        }
      }
      for (const owner of owners.values()) {
        TaskSet.removeTasksFromSet(owner, ids);
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
