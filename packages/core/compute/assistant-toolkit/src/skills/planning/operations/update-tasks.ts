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
import INSTRUCTIONS from './update-tasks.md?raw';

// Omit `chat`, `delegated`, and `agentPid` from the LLM-facing schema: these are set by the
// delegation tool / runtime, never by ordinary planning, and keeping them out leaves the tool
// schema unchanged.
const SimpleTask = Plan.Task.omit('chat', 'delegated', 'agentPid');

export const UpdateTasks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.planning.updateTasks'),
    name: 'Update tasks',
    description: INSTRUCTIONS,
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({
    tasks: Schema.Array(SimpleTask),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

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
