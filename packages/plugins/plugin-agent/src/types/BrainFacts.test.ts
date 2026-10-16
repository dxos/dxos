//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { type RDF } from '@dxos/pipeline-rdf';

import * as BrainMemory from '../brain/BrainMemory.ts';
import * as BrainFacts from './BrainFacts.ts';

const AGENT = 'kai';

const fact = (id: string, predicate = 'works at'): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: 'alice', label: 'Alice' },
    predicate,
    object: { kind: 'entity', entity: 'acme', label: 'Acme' },
  },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  attribution: { source: `dxn:message:${id}`, generatedAtTime: '2026-10-07T11:00:00.000Z' },
  recordedAt: '2026-10-07T11:00:00.000Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: id,
});

describe('BrainFacts', () => {
  it.effect('writes through the agent brain without waking it, and reads back', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain, facts } = BrainMemory.make(undefined);
      const store = BrainFacts.factStore(brain, AGENT);

      yield* store.putFacts([fact('f1'), fact('f2', 'leads')]);
      yield* store.setCursor('dxn:feed', 'hash-2');

      expect((yield* store.query({ predicate: 'leads' })).map(({ id }) => id)).toEqual(['f2']);
      expect(yield* store.cursor('dxn:feed')).toBe('hash-2');
      // The brain's own store is the one written: no second store exists.
      expect(yield* facts(AGENT).query({})).toHaveLength(2);
      expect(yield* brain.query('someone-else', {})).toEqual([]);
    }),
  );

  it.effect('predicates include those the facts minted', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(undefined);
      const store = BrainFacts.factStore(brain, AGENT);
      yield* store.putFacts([fact('f1', 'mentors')]);

      const labels = (yield* store.predicates()).map(({ label }) => label);
      expect(labels).toContain('mentors');
    }),
  );

  it.effect('clear empties the agent brain', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(undefined);
      const store = BrainFacts.factStore(brain, AGENT);
      yield* store.putFacts([fact('f1')]);
      yield* store.clear();
      expect(yield* brain.query(AGENT, {})).toEqual([]);
    }),
  );

  it.effect('a write without an agent fails; a read falls back to the only agent', ({ expect }) =>
    Effect.gen(function* () {
      const error = yield* BrainFacts.requireAgent(undefined).pipe(Effect.flip);
      expect(error).toBeInstanceOf(BrainFacts.NoTargetAgentError);
      expect(yield* BrainFacts.resolveAgent(undefined).pipe(Effect.flip)).toBeInstanceOf(BrainFacts.NoTargetAgentError);

      const agent = yield* Database.add(
        Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ text: '' })) }),
      );
      expect((yield* BrainFacts.resolveAgent(undefined)).id).toBe(agent.id);
      expect((yield* BrainFacts.requireAgent(Ref.make(agent))).id).toBe(agent.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Agent.Agent, Instructions.Instructions] }))),
  );
});
