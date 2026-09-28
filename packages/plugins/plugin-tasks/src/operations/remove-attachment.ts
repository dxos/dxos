//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.RemoveAttachment> = TaskOperation.RemoveAttachment.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, file: fileRef, actor }) {
      const task = yield* Database.load(taskRef);
      // Loaded first so the log can name it; a file that no longer loads can still be detached.
      const file = Option.getOrUndefined(yield* Database.load(fileRef).pipe(Effect.option));
      // Only a file this task both holds and owns is deleted: the ref is caller-supplied, and a stale
      // ref may name a file another object now owns.
      if (Task.removeAttachment(task, file ?? fileRef, { actor }) && file && Obj.getParent(file)?.id === task.id) {
        yield* Database.remove(file);
      }
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
