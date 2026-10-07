//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { BrainService, Trigger, TriggerOperation } from '#types';

const handler: Operation.WithHandler<typeof TriggerOperation.ListTriggers> = TriggerOperation.ListTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      return {
        triggers: (yield* brain.listTriggers(agent.id)).map(({ id, goal, when, then, createdAt }) => ({
          trigger: id,
          ...(goal ? { goal } : {}),
          when: Trigger.describePattern(when),
          recipient: then.recipient,
          message: then.message,
          createdAt,
        })),
      };
    }),
  ),
);

export default handler;
