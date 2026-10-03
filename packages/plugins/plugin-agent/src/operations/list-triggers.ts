//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Trigger, TriggerOperation } from '#types';

import { triggerRegistry } from '../triggers.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.ListTriggers> = TriggerOperation.ListTriggers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      return {
        triggers: triggerRegistry.list(agent.id).map(({ id, goal, when, then, createdAt }) => ({
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
