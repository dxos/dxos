//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '../types';

const handler: Operation.WithHandler<typeof TaskOperation.CreateTask> = TaskOperation.CreateTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet, title, description, priority, assignee, parent }) {
      const task = yield* Database.add(
        Task.make({ title: title.trim(), status: 'todo', description, priority, assignee }),
      );
      // Containment is the ECHO parent edge: sub-tasks parent to their parent task, roots to the set.
      const container = parent ? yield* Database.load(parent) : taskSet;
      Obj.setParent(task, container);
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
