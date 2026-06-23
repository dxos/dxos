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

import { Agent, Plan } from '../../../types';

export const DelegateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.delegation.delegateTask'),
    name: 'Delegate task',
    description: trim`
      Delegate a unit of work to a sub-agent.
      Provide either \`id\` (an existing plan task from update-tasks) or \`title\` (to create a new task).
      Marks the task in-progress and delegated so the supervisor spawns a background sub-agent.
    `,
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    id: Schema.optional(Plan.TaskId).annotations({
      description: 'Id of an existing plan task to delegate (from update-tasks).',
    }),
    title: Schema.optional(Schema.String).annotations({
      description: 'Title for a new task to create and delegate. Omit when delegating by id.',
    }),
  }),
  output: Schema.Any,
  services: [Harness.HarnessService, Database.Service],
});

/**
 * Records delegated work as an in-progress task on the current agent's plan.
 */
export default DelegateTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ id, title }) {
      const hasId = id !== undefined;
      const hasTitle = title !== undefined && title.length > 0;
      if (hasId === hasTitle) {
        return yield* Effect.fail(
          new Error('Provide exactly one of `id` (existing plan task) or `title` (new task to create).'),
        );
      }

      const agent = yield* Agent.getFromChatContext;
      const plan = yield* Database.load(agent.plan);

      if (hasId) {
        const existing = plan.tasks.find((task) => task.id === id);
        if (!existing) {
          return yield* Effect.fail(new Error(`Plan task not found: ${id}`));
        }
        if (existing.status === 'done' || existing.status === 'failed') {
          return yield* Effect.fail(
            new Error(`Plan task "${id}" is already ${existing.status} and cannot be delegated.`),
          );
        }

        Obj.update(plan, (plan) => {
          const task = plan.tasks.find((task) => task.id === id);
          if (task) {
            task.delegated = true;
            task.status = 'in-progress';
          }
        });
      } else {
        if (title === undefined) {
          return yield* Effect.fail(
            new Error('Provide exactly one of `id` (existing plan task) or `title` (new task to create).'),
          );
        }
        Obj.update(plan, (plan) => {
          Plan.addTasks(plan, [{ title, status: 'in-progress', delegated: true }]);
        });
      }

      return trim`
        Delegated work as an in-progress task. Current plan:
        <plan>
          ${Plan.formatPlan(plan)}
        </plan>
      `;
    }),
  ),
);
