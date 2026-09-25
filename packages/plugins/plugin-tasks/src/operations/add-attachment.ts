//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.AddAttachment> = TaskOperation.AddAttachment.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, file: fileRef, actor }) {
      const task = yield* Database.load(taskRef);
      const file = yield* Database.load(fileRef);
      Task.addAttachment(task, file, { actor });
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
