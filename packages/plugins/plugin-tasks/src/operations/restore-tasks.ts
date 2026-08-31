//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.RestoreTasks> = TaskOperation.RestoreTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ entries, taskSet }) {
      if (entries.length === 0) {
        return;
      }

      const db = Obj.getDatabase(entries[0].task);
      invariant(db, 'Restored tasks are not attached to a database.');

      const restored = entries.map(({ task, index }) => ({ task: db.add(task), index }));

      if (taskSet) {
        const placed = restored
          .flatMap(({ task, index }) => (index === undefined ? [] : [{ task, index }]))
          .sort((a, b) => a.index - b.index);
        Obj.update(taskSet, (taskSet) => {
          for (const { task, index } of placed) {
            taskSet.tasks.splice(index, 0, Ref.make(task));
          }
        });
      }

      yield* Effect.promise(() => db.flush());
    }),
  ),
);

export default handler;
