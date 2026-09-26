//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.MoveTaskToSet> = TaskOperation.MoveTaskToSet.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, taskSet: taskSetRef }) {
      const task = Database.peek(taskRef) ?? (yield* Database.load(taskRef));
      const target = Database.peek(taskSetRef) ?? (yield* Database.load(taskSetRef));
      const source = yield* TaskSet.findTaskSet(task);
      if (source?.id === target.id) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task already belongs to that task set.' }));
      }

      // Kept in the source's array order, so siblings arrive in the order they were listed.
      const order = new Map((source?.tasks ?? []).map((ref, index) => [Task.refEntityId(ref), index]));
      const subtree = (yield* Task.collectSubtree(task)).toSorted(
        (a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity),
      );
      const ids = new Set(subtree.map((member) => member.id));

      // A descendant may be filed in a set other than the root's; each one is swept so no set keeps
      // an entry for a task that now lives in the target.
      const sets = new Map<string, TaskSet.TaskSet>();
      for (const member of subtree) {
        const set = member.id === task.id ? source : yield* TaskSet.findTaskSet(member);
        if (set && set.id !== target.id) {
          sets.set(set.id, set);
        }
      }
      for (const set of sets.values()) {
        TaskSet.removeTasksFromSet(set, ids);
      }

      const present = new Set(target.tasks.map((ref) => Task.refEntityId(ref)));
      Obj.update(target, (target) => {
        target.tasks.push(...subtree.filter((member) => !present.has(member.id)).map((member) => Ref.make(member)));
      });

      for (const member of subtree) {
        Obj.update(member, (member) => {
          delete member.milestone;
        });
        if (member.id === task.id) {
          // The old parent stays behind, so the moved task arrives as a root.
          TaskSet.applyParentTask(target, member, undefined);
        } else {
          Obj.setParent(member, target);
        }
      }
      yield* Database.flush();

      return { task, moved: [...ids] };
    }),
  ),
);

export default handler;
