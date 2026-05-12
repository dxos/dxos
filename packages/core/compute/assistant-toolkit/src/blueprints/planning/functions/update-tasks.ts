//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { Plan, Agent } from '../../../types';
import INSTRUCTIONS from './update-tasks.md?raw';

const SimpleTask = Plan.Task.omit('chat');

export const UpdateTasks = Operation.make({
  meta: {
    key: 'org.dxos.function.planning.updateTasks',
    name: 'Update tasks',
    description: INSTRUCTIONS,
  },
  input: Schema.Struct({
    tasks: Schema.Array(SimpleTask),
  }),
  output: Schema.Any,
  services: [AiContextService, Database.Service],
});

export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ tasks: newTasks }) {
      const agent = yield* Agent.getFromChatContext;
      const plan = yield* Database.load(agent.plan);

      Obj.update(plan, (plan) => {
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
        You must update the task status to 'in-progress' when you start and 'done' when complete.
        Current plan updated:
        <plan>
          ${Plan.formatPlan(plan)}
        </plan>
      `;
    }) as any,
  ),
);
