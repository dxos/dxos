//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { TaskOperation } from '../types';

const handler: Operation.WithHandler<typeof TaskOperation.AssignTask> = TaskOperation.AssignTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task, assignee }) {
      Obj.update(task, (task) => {
        task.assignee = assignee;
      });
      return { task };
    }),
  ),
);

export default handler;
