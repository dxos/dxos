//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteTask> = TaskOperation.DeleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      const subtree = yield* Task.collectSubtree(task);
      const ids = new Set(subtree.map((member) => member.id));

      // Only the root's own set is swept; a member filed in another set leaves a dangling entry
      // there, which readers tolerate (a dangling ref reads as absent).
      const taskSet = yield* TaskSet.findTaskSet(task);

      // Read before the sweep: the array order is what an undo puts back.
      const entries = subtree.map((member) => {
        const index = taskSet?.tasks.findIndex((ref) => Task.refEntityId(ref) === member.id) ?? -1;
        return { task: member, index: index === -1 ? undefined : index };
      });

      if (taskSet) {
        TaskSet.removeTasksFromSet(taskSet, ids);
      }
      // Nothing cascades through `parentTask`, so the subtree is removed explicitly.
      for (const member of subtree) {
        yield* Database.remove(member);
      }
      yield* Database.flush();

      return { deleted: [...ids], restore: { entries, taskSet } };
    }),
  ),
);

export default handler;
