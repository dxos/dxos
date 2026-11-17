//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { makeFactStoreRegistry } from './fact-store.ts';

describe('FactStoreRegistry', () => {
  test('returns the same instance for a space', ({ expect }) => {
    const registry = makeFactStoreRegistry();
    expect(registry.forSpace('a')).toBe(registry.forSpace('a'));
  });

  test('returns distinct instances per space', ({ expect }) => {
    const registry = makeFactStoreRegistry();
    expect(registry.forSpace('a')).not.toBe(registry.forSpace('b'));
  });

  test('produces a working in-memory store', async ({ expect }) => {
    const registry = makeFactStoreRegistry();
    const store = registry.forSpace('a');
    const facts = await EffectEx.runPromise(store.query({}));
    expect(Array.isArray(facts)).toBe(true);
  });

  test('notifies subscribers after putFacts and clear, and stops after unsubscribe', async ({ expect }) => {
    const registry = makeFactStoreRegistry();
    const store = registry.forSpace('a');
    let notifications = 0;
    const unsubscribe = registry.subscribe('a', () => {
      notifications += 1;
    });

    await EffectEx.runPromise(store.putFacts([]));
    expect(notifications).toBe(1);
    await EffectEx.runPromise(store.clear());
    expect(notifications).toBe(2);

    // A subscriber for another space is never called for this space's mutations.
    let otherNotifications = 0;
    registry.subscribe('b', () => {
      otherNotifications += 1;
    });
    await EffectEx.runPromise(store.putFacts([]));
    expect(notifications).toBe(3);
    expect(otherNotifications).toBe(0);

    unsubscribe();
    await EffectEx.runPromise(store.putFacts([]));
    expect(notifications).toBe(3);
  });

  test('logs each SPARQL query as it starts and ends, with its row count or error', async ({ expect }) => {
    const registry = makeFactStoreRegistry();
    const store = registry.forSpace('a');
    const seen: number[] = [];
    registry.subscribeQueries('a', () => seen.push(registry.queries('a').length));

    const sparql = 'SELECT ?p WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 1';
    await EffectEx.runPromise(store.rows(sparql));
    const [first] = registry.queries('a');
    expect(first.sparql).toBe(sparql);
    expect(first.result && 'count' in first.result ? first.result.count : undefined).toBe(1);
    expect(first.result && 'preview' in first.result ? first.result.preview : []).toHaveLength(1);

    await EffectEx.runPromise(store.rows('DELETE WHERE { ?s ?p ?o }').pipe(Effect.exit));
    const [, second] = registry.queries('a');
    expect(second.result && 'error' in second.result).toBe(true);
    expect(seen).toEqual([1, 1, 2, 2]);
    expect(registry.queries('b')).toEqual([]);
  });

  test('notifies subscribers after importTrig', async ({ expect }) => {
    const registry = makeFactStoreRegistry();
    let notifications = 0;
    registry.subscribe('a', () => {
      notifications += 1;
    });
    const read = await EffectEx.runPromise(registry.forSpace('a').importTrig('<urn:a> <urn:b> <urn:c> .'));
    expect(read).toBe(1);
    expect(notifications).toBe(1);
  });
});
