//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { TaskOperation } from '../types';

const handler: Operation.WithHandler<typeof TaskOperation.CompleteTask> = TaskOperation.CompleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task }) {
      Obj.update(task, (task) => {
        task.status = 'done';
      });
      return { task };
    }),
  ),
);

export default handler;
