//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { BrainService, TriggerOperation } from '#types';

const handler: Operation.WithHandler<typeof TriggerOperation.InspectBrain> = TriggerOperation.InspectBrain.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      const facts = yield* brain.query(agent.id, {});
      const triggers = yield* brain.subscriptions(agent.id);
      const subscriptions = yield* Effect.forEach(triggers, (trigger) =>
        brain.take(trigger.id).pipe(Effect.map((pending) => ({ trigger, pending }))),
      );
      const nextDueAt = yield* brain.nextDueAt(agent.id);
      return { facts, subscriptions, ...(nextDueAt ? { nextDueAt } : {}) };
    }),
  ),
);

export default handler;
