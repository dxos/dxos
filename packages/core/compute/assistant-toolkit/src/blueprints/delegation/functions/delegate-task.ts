//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContext } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { Agent, Plan } from '../../../types';

export const DelegateTask = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.delegation.delegateTask'),
    name: 'Delegate task',
    description:
      'Delegate a unit of work to a sub-agent. Records the work as an in-progress task on the plan and returns the updated plan. Use this to hand off work that can proceed in the background while you continue the conversation.',
    icon: 'ph--share-network--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotations({
      description: 'Short title describing the work to delegate to a sub-agent.',
    }),
  }),
  output: Schema.Any,
  services: [AiContext.Service, Database.Service],
});

/**
 * Records delegated work as an in-progress task on the current agent's plan.
 */
export default DelegateTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ title }) {
      const agent = yield* Agent.getFromChatContext;
      const plan = yield* Database.load(agent.plan);
      Obj.update(plan, (plan) => {
        Plan.addTasks(plan, [{ title, status: 'in-progress' }]);
      });
      return trim`
        Delegated work as an in-progress task. Current plan:
        <plan>
          ${Plan.formatPlan(plan)}
        </plan>
      `;
    }),
  ),
);
