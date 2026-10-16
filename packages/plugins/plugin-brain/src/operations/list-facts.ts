//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as BrainService from '@dxos/plugin-agent/BrainService';

import { BrainOperation } from '#types';

const handler: Operation.WithHandler<typeof BrainOperation.ListFacts> = BrainOperation.ListFacts.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      const brain = yield* BrainService.BrainService;
      return { facts: yield* brain.query(agent.id, {}) };
    }),
  ),
);

export default handler;
