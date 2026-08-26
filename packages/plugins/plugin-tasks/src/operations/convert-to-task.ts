//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { OutlineOperation } from '#types';

const handler: Operation.WithHandler<typeof OutlineOperation.ConvertToTask> = OutlineOperation.ConvertToTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet, title }) {
      const { db } = yield* Database.Service;
      return { task: TaskSet.addTask(db, taskSet, title) };
    }),
  ),
);

export default handler;
