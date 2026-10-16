//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { AgentPresence, BrainService, TriggerOperation } from '#types';

import { deliver } from './deliver.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.RunDue> = TriggerOperation.RunDue.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      yield* brain.tick(AgentPresence.brainId(agent));
      // Delivers whatever this space has queued, not only what the tick woke: EDGE's brain ticks itself, and wakes a
      // watch set here from facts said in another space, before it runs this.
      const { fired, undelivered } = yield* deliver(agent);
      const nextDueAt = yield* brain.nextDueAt(AgentPresence.brainId(agent));
      return { fired, undelivered, ...(nextDueAt ? { nextDueAt } : {}) };
    }),
  ),
);

export default handler;
