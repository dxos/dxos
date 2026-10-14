//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.AddAttachment> = TaskOperation.AddAttachment.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, file: fileRef, actor }) {
      const task = yield* Database.load(taskRef);
      const file = yield* Database.load(fileRef);
      // Attaching re-parents the file, which would leave its current owner holding a ref whose removal
      // deletes a file this task now owns.
      const owner = Obj.getParent(file);
      if (owner && owner.id !== task.id) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The file belongs to another object.' }));
      }

      Task.addAttachment(task, file, { actor });
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
