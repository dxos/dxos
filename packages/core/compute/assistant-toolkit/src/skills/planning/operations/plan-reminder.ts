//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ContentBlock } from '@dxos/types';
import { trim } from '@dxos/util';

import { Plan, Agent } from '../../../types';
import { PlanReminder } from './definitions';

/**
 * End-request hook for the planning blueprint. Reads the agent's plan and, when tasks remain open,
 * enqueues a continuation reminder onto the owning host's queue (HarnessService Tier B). The enqueue
 * keeps the agent process alive so it continues working instead of completing with open tasks.
 */
export default PlanReminder.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const agent = yield* Agent.getFromChatContext.pipe(Effect.orElseSucceed(() => undefined));
      if (!agent) {
        return;
      }
      const plan = yield* Database.load(agent.plan).pipe(Effect.orElseSucceed(() => undefined));
      if (!plan || !Plan.hasIncompleteTasks(plan)) {
        return;
      }

      yield* Harness.enqueueMessage({
        content: [ContentBlock.Text.make({ text: planContinueReminderPrompt(plan), disposition: 'synthetic' })],
      });
    }),
  ),
);

const planContinueReminderPrompt = (plan: Plan.Plan): string => trim`
  Your plan still has incomplete tasks — continue working before finishing:

  <plan>
  ${Plan.formatPlan(plan)}
  </plan>
`;
