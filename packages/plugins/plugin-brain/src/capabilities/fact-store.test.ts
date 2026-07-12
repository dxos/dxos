//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { makeFactStoreRegistry } from './fact-store';

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
});
