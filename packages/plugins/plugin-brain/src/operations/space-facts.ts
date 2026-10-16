//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import { Database, Filter } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import * as BrainService from '@dxos/plugin-agent/BrainService';

/**
 * The facts matching the query in the brains of the space's agents, each once: two agents reading one source store
 * the same facts.
 */
export const spaceFacts = (query: BrainService.FactQuery) =>
  Effect.gen(function* () {
    const brain = yield* BrainService.BrainService;
    const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
    const facts = yield* Effect.forEach(agents, (agent) => brain.query(agent.id, query));
    return [...new Map(facts.flat().map((fact): [string, RDF.Fact] => [fact.id, fact])).values()];
  });
