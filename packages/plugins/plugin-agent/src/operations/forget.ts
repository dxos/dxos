//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { AgentPresence, BrainService, Knowledge, MemoryOperation } from '#types';

import { recordingAgent } from './knowledge.ts';
import { agentId } from './members.ts';

const handler: Operation.WithHandler<typeof MemoryOperation.Forget> = MemoryOperation.Forget.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, memories: ids }) {
      const agent = yield* recordingAgent(agentRef);
      const brain = yield* BrainService.BrainService;
      const wanted = ids ? new Set(ids) : undefined;
      const memories = Knowledge.fromFacts(yield* brain.query(AgentPresence.brainId(agent), {})).filter(
        (memory) => memory.status === 'active' && (!wanted || wanted.has(memory.id)),
      );
      const id = agentId(agent);
      // Retracted, not deleted: the brain is append-only, so what the agent once believed stays as history.
      yield* brain.push(
        AgentPresence.brainId(agent),
        memories.flatMap((memory) => Knowledge.retract(memory, id)),
        { quiet: [id] },
      );
      return { forgotten: memories.length };
    }),
  ),
);

export default handler;
