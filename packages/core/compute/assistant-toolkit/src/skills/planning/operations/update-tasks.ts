//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { Plan, Agent } from '../../../types';
import { UpdateTasks } from './definitions';

/**
 * Updates the planning document (Agent.plan) with the given tasks.
 */
export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ tasks: newTasks }) {
      const agent = yield* Agent.getFromChatContext;
      // TODO(burdon): How to specify requirements/preconditions before calling?
      // TODO(burdon): How to report non-technical error?
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
    }),
  ),
  Operation.opaqueHandler,
);
