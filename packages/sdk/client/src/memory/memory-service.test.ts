//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Fact, MemoryQuery, Subscription } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import { Client } from '../client/index.ts';
import { TestBuilder } from '../testing/index.ts';

const said = (id: string, speaker: string, object: string): Fact.Fact =>
  Fact.decode([
    {
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
    },
  ])[0];

describe('MemoryService', () => {
  test("a space's memory is served across the client services boundary", async ({ expect }) => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();

    const memory = client.memory(space.id);
    const watch = Subscription.SubscriptionId.make('watch');
    expect(
      await EffectEx.runPromise(
        memory.subscribe({ id: watch, rules: 'wake(dima) :- speaker(F, dima).', createdAt: new Date(0).toISOString() }),
      ),
    ).toBe(true);

    const chat = Fact.SourceUri.make('chat:general');
    expect(
      await EffectEx.runPromise(memory.put([said('f1', 'dima', 'indexer')], { read: { source: chat, through: 'f1' } })),
    ).toBe(1);
    const facts = await EffectEx.runPromise(
      memory.query(MemoryQuery.facts({ entity: Fact.EntityKey.make('indexer') })),
    );
    expect(facts.map(({ id }) => id)).toEqual(['f1']);
    expect(await EffectEx.runPromise(memory.query(MemoryQuery.cursor(chat)))).toBe('f1');
    const rows = await EffectEx.runPromise(
      memory.query(MemoryQuery.sparql('SELECT ?g WHERE { GRAPH ?g { ?s ?p ?o } }')),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(await EffectEx.runPromise(memory.take(watch))).toHaveLength(1);

    // Another space's memory is its own.
    const other = await client.spaces.create();
    await other.waitUntilReady();
    expect(await EffectEx.runPromise(client.memory(other.id).query(MemoryQuery.facts()))).toEqual([]);
  });

  test('an unknown space fails with a memory error', async ({ expect }) => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity();

    await expect(EffectEx.runPromise(client.memory(SpaceId.random()).query(MemoryQuery.facts()))).rejects.toThrow(
      /Unknown space/,
    );
  });
});
