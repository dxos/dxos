//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Fact, MemoryService } from '@dxos/echo-memory';
import { MemorySqlite } from '@dxos/echo-memory-sqlite';
import * as EffectEx from '@dxos/effect/EffectEx';

import { queryFacts, refreshFacts } from './use-facts.ts';

const mk = (over: Partial<Fact.Encoded> & Pick<Fact.Encoded, 'id'>): Fact.Fact =>
  Fact.make({
    assertion: {
      subject: { kind: 'entity', entity: 'alice' },
      predicate: 'travelsTo',
      object: { kind: 'entity', entity: 'paris' },
    },
    factuality: { value: 'PR+', polarity: '+', confidence: 0.6 },
    attribution: { agent: 'alice', source: 'dxn:q:m1', generatedAtTime: '2026-06-06T00:00:00.000Z' },
    recordedAt: '2026-06-06T12:00:00.000Z',
    extractor: { id: 'default', model: 'm', version: '1' },
    sourceHash: 'h1',
    ...over,
  });

/** Runs `use` over a fresh in-memory memory, closed afterwards. */
const withMemory = <A, E>(use: (memory: MemoryService.Service) => Effect.Effect<A, E>) =>
  EffectEx.runPromise(MemoryService.MemoryService.pipe(Effect.flatMap(use), Effect.provide(MemorySqlite.layerMemory)));

describe('queryFacts', () => {
  test('reads all facts from a seeded memory', async ({ expect }) => {
    const facts = await withMemory((memory) =>
      memory.put([mk({ id: 'f1' })]).pipe(Effect.andThen(Effect.promise(() => queryFacts(memory)))),
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].assertion.predicate).toBe('travelsTo');
  });

  test('returns an empty list for an empty memory', async ({ expect }) => {
    const facts = await withMemory((memory) => Effect.promise(() => queryFacts(memory)));
    expect(facts).toEqual([]);
  });
});

describe('refreshFacts', () => {
  /** Runs `act`, lets its promises settle, and returns the rejections nothing handled meanwhile. */
  const unhandledDuring = async (act: () => void): Promise<unknown[]> => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      act();
      // A real macrotask turn: an unhandled rejection is reported after the microtasks that could still handle it.
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.off('unhandledRejection', onRejection);
    }
    return rejections;
  };

  test('hands over the facts it reads', async ({ expect }) => {
    const seen: number[] = [];
    await withMemory((memory) =>
      memory
        .put([mk({ id: 'f1' })])
        .pipe(
          Effect.andThen(
            Effect.promise(() => unhandledDuring(() => refreshFacts(memory, (facts) => seen.push(facts.length)))),
          ),
        ),
    );
    expect(seen).toEqual([1]);
  });

  test('a read cut short by teardown ends quietly, with no facts and no unhandled rejection', async ({ expect }) => {
    const seen: number[] = [];
    // The client's shutdown interrupts a query still in flight, which is neither a result nor a failure.
    const rejections = await withMemory((memory) =>
      Effect.promise(() =>
        unhandledDuring(() =>
          refreshFacts({ ...memory, query: () => Effect.interrupt }, (facts) => seen.push(facts.length)),
        ),
      ),
    );
    expect(seen).toEqual([]);
    expect(rejections).toEqual([]);
  });
});
