//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { makeFactStoreRegistry } from './FactStoreRegistry';

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
    expect(facts).toHaveLength(0);
  });
});
