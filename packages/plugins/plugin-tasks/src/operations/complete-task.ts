//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Obj } from '@dxos/echo';

import { TaskOperation } from '../types';

const handler: Operation.WithHandler<typeof TaskOperation.CompleteTask> = TaskOperation.CompleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      Obj.update(task, (task) => {
        task.status = 'done';
      });
      return { task: Entity.toJSON(task) };
    }),
  ),
);

export default handler;
