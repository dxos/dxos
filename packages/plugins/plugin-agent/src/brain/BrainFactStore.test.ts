//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { BrainService, Trigger } from '#types';

import * as BrainFactStore from './BrainFactStore.ts';
import * as BrainMemory from './BrainMemory.ts';

const AGENT = 'kai';

const fact = (id: string, { confidence, predicate = 'works on' }: { confidence?: number; predicate?: string } = {}) =>
  ({
    id,
    assertion: {
      subject: { kind: 'entity', entity: 'dima', label: 'Dima' },
      predicate,
      object: { kind: 'entity', entity: 'indexer', label: 'indexer' },
    },
    factuality: { value: 'CT+', polarity: '+', ...(confidence !== undefined ? { confidence } : {}) },
    attribution: { agent: 'dima', source: 'dxn:doc', generatedAtTime: '2026-10-07T11:00:00.000Z' },
    recordedAt: '2026-10-07T11:00:00.000Z',
    extractor: { id: 'test', model: 'test', version: '1' },
    sourceHash: 'hash',
  }) satisfies RDF.Fact;

describe('BrainFactStore', () => {
  it.effect('writes into the agent brain without waking its subscriptions', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.makeDetached();
      yield* brain.subscribe({
        id: 'watch',
        agent: AGENT,
        when: { speaker: 'dima' },
        then: {
          _tag: 'notify',
          recipient: Ref.make<Obj.Unknown>(Obj.make(Person.Person, { fullName: 'Josiah' })),
          message: 'Update: {fact}',
        },
        createdAt: '2026-10-07T10:00:00.000Z',
      } satisfies Trigger.Trigger);

      const store = BrainFactStore.make(brain, AGENT);
      yield* store.putFacts([fact('f1')]);
      yield* store.setCursor('dxn:doc', 'h1');

      expect((yield* brain.query(AGENT, {})).map(({ id }) => id)).toEqual(['f1']);
      expect(yield* brain.readThrough(AGENT, 'dxn:doc')).toBe('h1');
      expect(yield* store.cursor('dxn:doc')).toBe('h1');
      expect(yield* brain.take('watch')).toEqual([]);
    }),
  );

  it.effect('bounds a query by confidence and lists the predicates its facts minted', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.makeDetached();
      yield* brain.push(AGENT, [fact('f1', { confidence: 0.9 }), fact('f2', { confidence: 0.4 }), fact('f3')]);

      const store = yield* FactStore.pipe(
        Effect.provide(BrainFactStore.layer(AGENT)),
        Effect.provideService(BrainService.BrainService, brain),
      );
      expect((yield* store.query({ minConfidence: 0.5 })).map(({ id }) => id)).toEqual(['f1']);
      expect((yield* store.predicates()).some(({ label }) => label === 'works on')).toBe(true);
    }),
  );
});
