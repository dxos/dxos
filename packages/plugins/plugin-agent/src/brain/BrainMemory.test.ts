//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Evaluator from '@dxos/brain/Evaluator';
import type * as AgentService from '@dxos/compute/AgentService';
import { Obj, Ref } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { BrainService, Trigger } from '#types';

import * as BrainMemory from './BrainMemory.ts';

const AGENT = 'kai';
const STARTED = '2026-10-07T10:00:00.000Z';
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const now = () => NOW;

// Waking is not under test here; a brain that tried would fail loudly.
const agents: AgentService.Service = {
  getSession: () => Effect.die('getSession is not used by these tests'),
  hydrate: () => Effect.void,
};

const fact = (
  id: string,
  { speaker = 'dima', quote = 'I am working on the indexer migration.', saidAt = '2026-10-07T11:00:00.000Z' } = {},
): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: speaker, label: speaker },
    predicate: 'works on',
    object: { kind: 'entity', entity: 'indexer-migration', label: 'indexer migration' },
    quote,
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { agent: speaker, source: 'dxn:chat', generatedAtTime: saidAt },
  recordedAt: saidAt,
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const subscription = (id: string, when: Trigger.FactPattern, options: { ongoing?: boolean } = {}): Trigger.Trigger => ({
  id,
  agent: AGENT,
  when,
  then: {
    _tag: 'notify',
    recipient: Ref.make<Obj.Unknown>(Obj.make(Person.Person, { fullName: 'Josiah' })),
    message: 'Update: {fact}',
  },
  createdAt: STARTED,
  ...options,
});

describe('BrainMemory', () => {
  it.effect('push stores facts and queues an event in each matching subscription', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('dima', { speaker: 'Dima' }));
      yield* brain.subscribe(subscription('rich', { speaker: 'Rich' }));

      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(1);
      expect((yield* brain.query(AGENT, { subjectEntity: 'dima' })).map(({ id }) => id)).toEqual(['f1']);
      expect((yield* brain.take('dima')).map(({ id }) => id)).toEqual([
        Evaluator.eventId('dima', Trigger.MATCH_LABEL, ['f1'], NOW),
      ]);
      expect(yield* brain.take('rich')).toEqual([]);
    }),
  );

  it.effect('events stay queued until acknowledged', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('dima', { speaker: 'Dima' }, { ongoing: true }));
      yield* brain.push(AGENT, [fact('f1'), fact('f2', { quote: 'The migration is half done.' })]);

      const events = yield* brain.take('dima');
      expect(events.map(({ facts }) => facts[0]?.id)).toEqual(['f1', 'f2']);
      // Taking again without an ack re-delivers: a consumer that failed mid-delivery sees them again.
      expect(yield* brain.take('dima')).toHaveLength(2);

      yield* brain.ack('dima', [events[0].id, 'unknown']);
      expect((yield* brain.take('dima')).map(({ facts }) => facts[0]?.id)).toEqual(['f2']);
    }),
  );

  it.effect('a fact pushed again queues nothing new, even after it was acknowledged', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('dima', { speaker: 'Dima' }));
      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(1);
      yield* brain.ack('dima', [Evaluator.eventId('dima', Trigger.MATCH_LABEL, ['f1'], NOW)]);

      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(0);
      expect(yield* brain.take('dima')).toEqual([]);
      expect(yield* brain.query(AGENT, {})).toHaveLength(1);
    }),
  );

  it.effect('quiet speakers and facts said before the subscription queue nothing', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('migration', { about: 'indexer migration' }));

      const queued = yield* brain.push(
        AGENT,
        [
          fact('own', { speaker: 'kai', quote: 'Dima is on the indexer migration.' }),
          fact('old', { saidAt: '2026-10-07T09:00:00.000Z' }),
          fact('new'),
        ],
        { quiet: ['kai'] },
      );
      expect(queued).toBe(1);
      expect((yield* brain.take('migration')).map(({ facts }) => facts[0]?.id)).toEqual(['new']);
      // Quiet facts are still knowledge.
      expect(yield* brain.query(AGENT, {})).toHaveLength(3);
    }),
  );

  it.effect('unsubscribe drops the outbox and reports whether it removed anything', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('dima', { speaker: 'Dima' }));
      yield* brain.push(AGENT, [fact('f1')]);

      expect(yield* brain.unsubscribe('dima')).toBe(true);
      expect(yield* brain.unsubscribe('dima')).toBe(false);
      expect(yield* brain.take('dima')).toEqual([]);
      expect(yield* brain.subscriptions(AGENT)).toEqual([]);
      expect(yield* brain.push(AGENT, [fact('f2')])).toBe(0);
    }),
  );

  it.effect('subscribe refuses past the cap but replaces an existing subscription', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      for (let index = 0; index < BrainService.MAX_TRIGGERS; index++) {
        expect(yield* brain.subscribe(subscription(`s${index}`, { speaker: 'Dima' }))).toBe(true);
      }
      expect(yield* brain.subscribe(subscription('overflow', { speaker: 'Dima' }))).toBe(false);
      expect(yield* brain.subscribe(subscription('s0', { speaker: 'Rich' }))).toBe(true);
      expect(yield* brain.subscriptions(AGENT)).toHaveLength(BrainService.MAX_TRIGGERS);
    }),
  );

  it.effect('events round-trip through JSON, as across a wire', ({ expect }) =>
    Effect.gen(function* () {
      const { service: brain } = BrainMemory.make(agents, { now });
      yield* brain.subscribe(subscription('dima', { speaker: 'Dima' }));
      yield* brain.push(AGENT, [fact('f1')]);
      const [event] = yield* brain.take('dima');
      expect(BrainService.decodeEvent(JSON.parse(JSON.stringify(BrainService.encodeEvent(event))))).toEqual(event);
    }),
  );
});
