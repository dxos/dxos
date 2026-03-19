//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

import { UpdateTasks } from './definitions';
import { Plan, Project } from '../../../types';

export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tasks: newTasks }) {
      const project = yield* Project.getFromChatContext;
      const plan = yield* Database.load(project.plan);

      Obj.change(plan, (plan) => {
        for (const task of newTasks) {
          const existingTask = plan.tasks.find((t) => t.id === task.id);
          if (existingTask) {
            existingTask.title = task.title;
            existingTask.status = task.status;
          } else {
            plan.tasks.push({
              id: task.id,
              title: task.title,
              status: task.status,
            });
          }
        }
      });

      return trim`
        Tasks updated. Don't forget to mark tasks as done when you're done with them or update their status to 'in-progress' when you start working on them.
        Current plan:
        <plan>
          ${Plan.formatPlan(plan)}
        </plan>
      `;
    }) as any,
  ),
);
