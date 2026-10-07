//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.RestoreTasks> = TaskOperation.RestoreTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ entries, taskSet, parentTask }) {
      if (entries.length === 0) {
        return;
      }

      const db = Obj.getDatabase(entries[0].task);
      invariant(db, 'Restored tasks are not attached to a database.');

      const restored = entries.map(({ task, index }) => ({ task: db.add(task), index }));

      // Sub-tasks come back still listed by their restored parents; only the deleted task itself
      // left a list, and it goes back to the one it held.
      const holder = parentTask ?? taskSet;
      if (holder) {
        for (const { task, index } of restored) {
          if (index !== undefined) {
            TaskSet.insertTaskAt(holder, task, index);
          }
        }
      }

      yield* Effect.promise(() => db.flush());
    }),
  ),
);

export default handler;
