//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { OutlineOperation, OutlineTasks } from '../types';

const handler: Operation.WithHandler<typeof OutlineOperation.ConvertToTask> = OutlineOperation.ConvertToTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline, title }) {
      const { db } = yield* Database.Service;
      const task = yield* Effect.promise(() => OutlineTasks.createTask(outline, db, title));
      return { task };
    }),
  ),
);

export default handler;
