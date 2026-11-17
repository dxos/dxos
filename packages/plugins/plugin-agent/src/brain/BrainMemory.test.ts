//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as TestClock from 'effect/testing/TestClock';

import * as Evaluator from '@dxos/brain/Evaluator';
import { Obj, Ref } from '@dxos/echo';
import { Fact, MemoryService } from '@dxos/echo-memory';
import { MemorySqlite } from '@dxos/echo-memory-sqlite';
import { Person } from '@dxos/types';

import { BrainService, Trigger } from '#types';

import * as BrainMemory from './BrainMemory.ts';
import { TEST_MEMBERS, UNUSED_AGENTS } from './testing.ts';

const AGENT = 'kai';
const STARTED = '2026-10-07T10:00:00.000Z';
const NOW = Date.parse('2026-10-07T12:00:00.000Z');

/** A brain over a fresh in-memory space memory whose clock reads {@link NOW}. */
const makeBrain = Effect.gen(function* () {
  yield* TestClock.setTime(NOW);
  const memory = yield* Layer.build(MemorySqlite.layerMemory).pipe(
    Effect.map(Context.get(MemoryService.MemoryService)),
  );
  return BrainMemory.make(UNUSED_AGENTS, memory).service;
});

const fact = (
  id: string,
  {
    speaker = TEST_MEMBERS.dima,
    quote = 'I am working on the indexer migration.',
    saidAt = '2026-10-07T11:00:00.000Z',
  }: { speaker?: string; quote?: string; saidAt?: string } = {},
): Fact.Fact =>
  Fact.make({
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
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }));
      yield* brain.subscribe(subscription('rich', { speaker: TEST_MEMBERS.rich }));

      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(1);
      expect((yield* brain.query(AGENT, { subjectEntity: TEST_MEMBERS.dima })).map(({ id }) => id)).toEqual(['f1']);
      expect((yield* brain.take('dima')).map(({ id }) => id)).toEqual([
        Evaluator.eventId('dima', Trigger.MATCH_LABEL, ['f1'], NOW),
      ]);
      expect(yield* brain.take('rich')).toEqual([]);
    }).pipe(Effect.scoped),
  );

  it.effect('reset forgets facts, cursors and queued events but keeps subscriptions', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }, { ongoing: true }));
      yield* brain.push(AGENT, [fact('f1')], { read: { source: 'dxn:chat', through: 'm1' } });
      expect(yield* brain.take('dima')).toHaveLength(1);

      yield* brain.reset(AGENT);
      expect(yield* brain.query(AGENT, {})).toEqual([]);
      expect(yield* brain.readThrough(AGENT, 'dxn:chat')).toBeUndefined();
      expect(yield* brain.take('dima')).toEqual([]);
      expect((yield* brain.subscriptions(AGENT)).map(({ id }) => id)).toEqual(['dima']);

      // The same fact read again is new to a reset brain, so it queues again.
      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(1);
    }).pipe(Effect.scoped),
  );

  it.effect('events stay queued until acknowledged', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }, { ongoing: true }));
      yield* brain.push(AGENT, [fact('f1'), fact('f2', { quote: 'The migration is half done.' })]);

      const events = yield* brain.take('dima');
      expect(events.map(({ facts }) => facts[0]?.id)).toEqual(['f1', 'f2']);
      // Taking again without an ack re-delivers: a consumer that failed mid-delivery sees them again.
      expect(yield* brain.take('dima')).toHaveLength(2);

      yield* brain.ack('dima', [events[0].id, 'unknown']);
      expect((yield* brain.take('dima')).map(({ facts }) => facts[0]?.id)).toEqual(['f2']);
    }).pipe(Effect.scoped),
  );

  it.effect('a fact pushed again queues nothing new, even after it was acknowledged', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }));
      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(1);
      yield* brain.ack('dima', [Evaluator.eventId('dima', Trigger.MATCH_LABEL, ['f1'], NOW)]);

      expect(yield* brain.push(AGENT, [fact('f1')])).toBe(0);
      expect(yield* brain.take('dima')).toEqual([]);
      expect(yield* brain.query(AGENT, {})).toHaveLength(1);
    }).pipe(Effect.scoped),
  );

  it.effect('quiet speakers and facts said before the subscription queue nothing', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
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
    }).pipe(Effect.scoped),
  );

  it.effect('unsubscribe drops the outbox and reports whether it removed anything', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }));
      yield* brain.push(AGENT, [fact('f1')]);

      expect(yield* brain.unsubscribe('dima')).toBe(true);
      expect(yield* brain.unsubscribe('dima')).toBe(false);
      expect(yield* brain.take('dima')).toEqual([]);
      expect(yield* brain.subscriptions(AGENT)).toEqual([]);
      expect(yield* brain.push(AGENT, [fact('f2')])).toBe(0);
    }).pipe(Effect.scoped),
  );

  it.effect('subscribe refuses past the cap but replaces an existing subscription', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      for (let index = 0; index < BrainService.MAX_TRIGGERS; index++) {
        expect(yield* brain.subscribe(subscription(`s${index}`, { speaker: TEST_MEMBERS.dima }))).toBe(true);
      }
      expect(yield* brain.subscribe(subscription('overflow', { speaker: TEST_MEMBERS.dima }))).toBe(false);
      expect(yield* brain.subscribe(subscription('s0', { speaker: TEST_MEMBERS.rich }))).toBe(true);
      expect(yield* brain.subscriptions(AGENT)).toHaveLength(BrainService.MAX_TRIGGERS);
    }).pipe(Effect.scoped),
  );

  it.effect('events round-trip through JSON, as across a wire', ({ expect }) =>
    Effect.gen(function* () {
      const brain = yield* makeBrain;
      yield* brain.subscribe(subscription('dima', { speaker: TEST_MEMBERS.dima }));
      yield* brain.push(AGENT, [fact('f1')]);
      const [event] = yield* brain.take('dima');
      expect(BrainService.decodeEvent(JSON.parse(JSON.stringify(BrainService.encodeEvent(event))))).toEqual(event);
    }).pipe(Effect.scoped),
  );
});
