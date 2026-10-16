//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { FactStore, type SemanticIndexError } from '@dxos/pipeline-rdf';
import * as AgentPresence from '@dxos/plugin-agent/AgentPresence';
import * as BrainFacts from '@dxos/plugin-agent/BrainFacts';
import * as BrainService from '@dxos/plugin-agent/BrainService';

import { BrainOperation } from '#types';

import { toCompactFact } from './facts.ts';

export default BrainOperation.QueryFacts.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent: agentRef, ...input }) {
      const agent = yield* BrainFacts.resolveAgent(agentRef);
      const brain = yield* BrainService.BrainService;
      const facts = yield* queryCompactFacts(input).pipe(
        Effect.provideService(FactStore, BrainFacts.factStore(brain, AgentPresence.brainId(agent))),
      );
      return { facts };
    }),
  ),
);

/**
 * Runs the structured query against a FactStore (the agent's brain) and projects the matches onto the compact
 * LLM-facing shape, bounded by `limit`. Named export so the read path is unit-testable without the
 * operation runtime.
 */
export const queryCompactFacts = ({
  limit,
  ...query
}: Omit<typeof BrainOperation.QueryFacts.input.Type, 'agent'>): Effect.Effect<
  BrainOperation.CompactFact[],
  SemanticIndexError,
  FactStore
> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const facts = yield* store.query(query);
    return facts.slice(0, limit ?? BrainOperation.DEFAULT_QUERY_FACTS_LIMIT).map(toCompactFact);
  });
