//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.MoveTaskToSet> = TaskOperation.MoveTaskToSet.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, taskSet: taskSetRef }) {
      const task = Database.peek(taskRef) ?? (yield* Database.load(taskRef));
      const target = Database.peek(taskSetRef) ?? (yield* Database.load(taskSetRef));
      // A move never crosses a space: the refs it writes would not resolve in the other database.
      if (Obj.getDatabase(task)?.spaceId !== Obj.getDatabase(target)?.spaceId) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task set is in another space.' }));
      }

      const source = yield* TaskSet.findTaskSet(task);
      if (!source) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task does not belong to a task set.' }));
      }
      if (source.id === target.id) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task already belongs to that task set.' }));
      }

      // Only the moved task changes holder: its descendants stay listed under it, so the tree travels
      // whole, and the old parent stays behind, so it arrives as a root.
      const subtree = yield* Task.collectSubtree(task);
      TaskSet.detach(source, task);
      TaskSet.addTaskToSet(target, task);
      Obj.setParent(task, target);
      for (const member of subtree) {
        Obj.update(member, (member) => {
          delete member.milestone;
        });
      }
      yield* Database.flush();

      return { task, moved: subtree.map((member) => member.id) };
    }),
  ),
);

export default handler;
