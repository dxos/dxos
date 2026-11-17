//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, onTestFinished, test } from 'vitest';

import { Fact, MemoryQuery, Subscription } from '@dxos/echo-memory';
import * as RdfMemory from '@dxos/echo-memory-sqlite/RdfMemory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import { Client } from '../client/index.ts';
import { TestBuilder } from '../testing/index.ts';

const said = (id: string, speaker: string, object: string): Fact.Fact =>
  Fact.make({
    id,
    assertion: {
      subject: { kind: 'entity', entity: speaker },
      predicate: 'works on',
      object: { kind: 'entity', entity: object },
    },
    factuality: { value: 'CT+', polarity: '+' },
    attribution: { agent: speaker, source: `chat:general/${id}`, generatedAtTime: new Date().toISOString() },
    recordedAt: new Date().toISOString(),
    extractor: { id: 'test', model: 'none', version: '1' },
    sourceHash: id,
  });

const openClient = async () => {
  const testBuilder = new TestBuilder();
  onTestFinished(() => testBuilder.destroy());
  const client = new Client({ services: testBuilder.createLocalClientServices() });
  await client.initialize();
  onTestFinished(() => client.destroy());
  await client.halo.createIdentity();
  return client;
};

describe('RdfMemory over client.rdf', () => {
  test("a memory in this process runs on the space's store across the client services boundary", async ({ expect }) => {
    const client = await openClient();
    const space = await client.spaces.create();
    await space.waitUntilReady();

    await EffectEx.runPromise(
      Effect.gen(function* () {
        const memory = yield* RdfMemory.make(client.rdf(space.id));
        const watch = Subscription.SubscriptionId.make('watch');
        expect(
          yield* memory.subscribe({
            id: watch,
            rules: 'wake(dima) :- speaker(F, dima).',
            createdAt: new Date(0).toISOString(),
          }),
        ).toBe(true);

        const chat = Fact.SourceUri.make('chat:general');
        expect(yield* memory.put([said('f1', 'dima', 'indexer')], { read: { source: chat, through: 'f1' } })).toBe(1);
        const facts = yield* memory.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') }));
        expect(facts).toHaveLength(1);
        expect(yield* memory.query(MemoryQuery.cursor(chat))).toBe('f1');
        expect(yield* memory.query(MemoryQuery.sparql('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }'))).not.toEqual([]);
        expect(yield* memory.take(watch)).toHaveLength(1);

        // Another space's store is its own, and takes a copy of this one through export and import.
        const other = yield* Effect.promise(() => client.spaces.create());
        yield* Effect.promise(() => other.waitUntilReady());
        const copy = yield* RdfMemory.make(client.rdf(other.id));
        expect(yield* copy.query(MemoryQuery.facts())).toEqual([]);
        const data = yield* client.rdf(space.id).export('binary');
        yield* client.rdf(other.id).import(data, 'binary');
        expect((yield* copy.query(MemoryQuery.facts())).map(({ id }) => id)).toEqual(facts.map(({ id }) => id));
      }).pipe(Effect.scoped),
    );
  });

  test('an unknown space fails with a store error', async ({ expect }) => {
    const client = await openClient();
    await expect(
      EffectEx.runPromise(client.rdf(SpaceId.random()).query('SELECT * WHERE { ?s ?p ?o }')),
    ).rejects.toThrow(/Unknown space/);
  });
});
