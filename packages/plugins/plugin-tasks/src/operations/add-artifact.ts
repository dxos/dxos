//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.AddArtifact> = TaskOperation.AddArtifact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, object: objectRef }) {
      const task = yield* Database.load(taskRef);
      const object = yield* Database.load(objectRef);
      Task.addArtifact(task, object);
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
