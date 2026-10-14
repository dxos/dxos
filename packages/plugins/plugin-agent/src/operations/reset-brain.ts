//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { BrainService, TriggerOperation } from '#types';

const handler: Operation.WithHandler<typeof TriggerOperation.ResetBrain> = TriggerOperation.ResetBrain.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      yield* brain.reset(agent.id);
      return {};
    }),
  ),
);

export default handler;
