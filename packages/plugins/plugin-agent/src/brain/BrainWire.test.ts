//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { Obj, Ref } from '@dxos/echo';
import { RDF } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { BrainService, Trigger } from '#types';

import * as BrainMemory from './BrainMemory.ts';
import * as BrainWire from './BrainWire.ts';
import { TEST_MEMBERS, UNUSED_AGENTS } from './testing.ts';

const AGENT = 'kai';
const NOW = Date.parse('2026-10-07T12:00:00.000Z');

const fact = (id: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: TEST_MEMBERS.dima, label: TEST_MEMBERS.dima },
    predicate: 'works on',
    object: { kind: 'entity', entity: 'indexer-migration', label: 'indexer migration' },
    quote: 'I am working on the indexer migration.',
  },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { agent: TEST_MEMBERS.dima, source: 'dxn:chat', generatedAtTime: '2026-10-07T11:00:00.000Z' },
  recordedAt: '2026-10-07T11:00:00.000Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: 'hash',
});

const PushOptions = Schema.Struct({
  quiet: Schema.optional(Schema.Array(Schema.String)),
  read: Schema.optional(Schema.Struct({ source: Schema.String, through: Schema.String })),
});

/**
 * What EDGE's brain does with each call: decode the plain data, run the brain, and answer with plain data. Every
 * argument is recorded, so a test can check that only plain data crossed.
 */
const serve = (brain: BrainService.Service, calls: unknown[][]): Capabilities.HostServiceProxy => {
  const decode = <A>(schema: Schema.Codec<A, unknown>, value: unknown) => Schema.decodeUnknownSync(schema)(value);
  const text = (value: unknown) => decode(Schema.String, value);
  const methods: Record<string, (...args: readonly unknown[]) => Effect.Effect<unknown, Error>> = {
    push: (agent, facts, options) =>
      brain.push(text(agent), decode(Schema.Array(RDF.Fact), facts), decode(PushOptions, options)),
    tick: (agent) => brain.tick(text(agent)),
    nextDueAt: (agent) => brain.nextDueAt(text(agent)),
    query: (agent, query) => brain.query(text(agent), decode(BrainService.FactQuery, query)),
    readThrough: (agent, source) => brain.readThrough(text(agent), text(source)),
    reset: (agent) => brain.reset(text(agent)),
    subscribe: (_agent, json) => brain.subscribe(BrainService.decodeTrigger(JSON.parse(text(json)))),
    subscriptions: (agent) =>
      brain
        .subscriptions(text(agent))
        .pipe(Effect.map((listed) => listed.map((trigger) => JSON.stringify(BrainService.encodeTrigger(trigger))))),
    unsubscribe: (_agent, id) => brain.unsubscribe(text(id)),
    take: (_agent, id) =>
      brain
        .take(text(id))
        .pipe(Effect.map((events) => events.map((event) => JSON.stringify(BrainService.encodeEvent(event))))),
    ack: (_agent, id, ids) => brain.ack(text(id), decode(Schema.Array(Schema.String), ids)),
  };
  return Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
      name,
      (...args: readonly unknown[]) => {
        calls.push([name, ...args]);
        return method(...args);
      },
    ]),
  );
};

const setup = () => {
  const calls: unknown[][] = [];
  const { service: memory } = BrainMemory.make(UNUSED_AGENTS, { now: () => NOW });
  return { calls, brain: BrainWire.make(serve(memory, calls)) };
};

const subscription = (): Trigger.Trigger => ({
  id: Trigger.makeId(AGENT),
  agent: AGENT,
  when: { speaker: TEST_MEMBERS.dima },
  then: {
    _tag: 'notify',
    recipient: Ref.make<Obj.Unknown>(Obj.make(Person.Person, { fullName: 'Josiah' })),
    message: 'Update: {fact}',
  },
  createdAt: '2026-10-07T10:00:00.000Z',
  ongoing: true,
});

describe('BrainWire', () => {
  it.effect('a subscription crosses as JSON and comes back with its refs', ({ expect }) =>
    Effect.gen(function* () {
      const { brain } = setup();
      const trigger = subscription();
      expect(yield* brain.subscribe(trigger)).toBe(true);

      const [listed] = yield* brain.subscriptions(AGENT);
      expect(listed.id).toBe(trigger.id);
      expect(listed.then._tag === 'notify' && Ref.isRef(listed.then.recipient)).toBe(true);
    }),
  );

  it.effect(
    'pushed facts queue events, which are taken, acknowledged and dropped with the subscription',
    ({ expect }) =>
      Effect.gen(function* () {
        const { brain, calls } = setup();
        const trigger = subscription();
        yield* brain.subscribe(trigger);

        expect(yield* brain.push(AGENT, [fact('f1')], { read: { source: 'dxn:chat', through: 'm1' } })).toBe(1);
        expect(yield* brain.readThrough(AGENT, 'dxn:chat')).toBe('m1');
        expect((yield* brain.query(AGENT, {})).map(({ id }) => id)).toEqual(['f1']);

        const events = yield* brain.take(trigger.id);
        expect(events.map(({ facts }) => facts[0]?.id)).toEqual(['f1']);
        yield* brain.ack(trigger.id, [events[0].id]);
        expect(yield* brain.take(trigger.id)).toEqual([]);

        expect(yield* brain.unsubscribe(trigger.id)).toBe(true);
        expect(yield* brain.unsubscribe(trigger.id)).toBe(false);

        // Only plain data crossed: what JSON copies unchanged.
        for (const call of calls) {
          expect(JSON.parse(JSON.stringify(call))).toEqual(call);
        }
      }),
  );

  it.effect('a subscription id that names no agent answers without calling EDGE', ({ expect }) =>
    Effect.gen(function* () {
      const { brain, calls } = setup();
      expect(yield* brain.take('legacy')).toEqual([]);
      expect(yield* brain.unsubscribe('legacy')).toBe(false);
      expect(calls).toEqual([]);
    }),
  );

  it.effect('a call EDGE does not serve fails as a brain error', ({ expect }) =>
    Effect.gen(function* () {
      const brain = BrainWire.make({});
      const error = yield* brain.tick(AGENT).pipe(Effect.flip);
      expect(error).toBeInstanceOf(BrainService.BrainError);
    }),
  );
});
