//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { BrainService, TriggerOperation } from '#types';

import { deliver } from './run-triggers.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.RunDue> = TriggerOperation.RunDue.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      const queued = yield* brain.tick(agent.id);
      const { fired, undelivered } = queued > 0 ? yield* deliver(agent) : { fired: [], undelivered: [] };
      const nextDueAt = yield* brain.nextDueAt(agent.id);
      return { fired, undelivered, ...(nextDueAt ? { nextDueAt } : {}) };
    }),
  ),
);

export default handler;
