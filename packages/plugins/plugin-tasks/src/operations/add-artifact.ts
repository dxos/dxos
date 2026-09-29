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

      // A PR goes to the root of the task's tree, where every sub-task finds it.
      const target = yield* Task.artifactTarget(task, object);
      Task.addArtifact(target, object);
      yield* Database.flush();
      return { task: target };
    }),
  ),
);

export default handler;
