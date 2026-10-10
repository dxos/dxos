//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { BrainService, Trigger, TriggerOperation } from '#types';

import { labelOf, loadMembers } from './members.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.ListTriggers> = TriggerOperation.ListTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      const label = labelOf(yield* loadMembers);
      return {
        triggers: (yield* brain.subscriptions(agent.id)).map(({ id, goal, when, then, createdAt }) => ({
          trigger: id,
          ...(goal ? { goal } : {}),
          when: Trigger.describePattern(when, label),
          recipient: then.recipient,
          message: then.message,
          createdAt,
        })),
      };
    }),
  ),
);

export default handler;
