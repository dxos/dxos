//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Obj, Ref } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import * as BrainMemory from '@dxos/plugin-agent/BrainMemory';
import * as BrainService from '@dxos/plugin-agent/BrainService';

/** The types a test database needs to hold the agent {@link brainWithFacts} adds. */
export const AGENT_TYPES = [Agent.Agent, Instructions.Instructions];

/** An agent added to the space with the given facts in its in-memory brain. */
export const addAgent = (
  brain: BrainService.Service,
  facts: readonly RDF.Fact[] = [],
): Effect.Effect<Agent.Agent, never, Database.Service> =>
  Effect.gen(function* () {
    const agent = yield* Database.add(
      Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ name: 'Kai', text: '' })) }),
    );
    yield* brain.push(agent.id, facts).pipe(Effect.orDie);
    return agent;
  });

/** An in-memory brain over the test database, whose one agent knows the facts. */
export const brainWithFacts = (
  facts: readonly RDF.Fact[] = [],
): Layer.Layer<BrainService.BrainService, never, Database.Service> =>
  Layer.effect(
    BrainService.BrainService,
    Effect.gen(function* () {
      const { service } = BrainMemory.makeDetached();
      yield* addAgent(service, facts);
      return service;
    }),
  );
