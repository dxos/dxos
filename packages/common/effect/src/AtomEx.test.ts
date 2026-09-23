//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as AtomEx from './AtomEx.ts';

const TTL = 100;

describe('AtomEx.makeRegistry', () => {
  test('keeps an unobserved node through the grace period', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.millis(TTL) });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    const node = registry.getNodes().get(atom);
    // Past the task on which a registry without a TTL removes the node.
    await wait(TTL / 4);
    const unsubscribe = registry.subscribe(atom, () => {});
    expect(registry.getNodes().get(atom)).toBe(node);

    unsubscribe();
    await wait(TTL * 3);
    expect(registry.getNodes().size).toBe(0);
  });

  test('a zero grace period removes on the next task', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.zero });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await wait(TTL / 4);
    expect(registry.getNodes().size).toBe(0);
  });

  test('rejects an infinite grace period', ({ expect }) => {
    expect(() => AtomEx.makeRegistry({ idleTTL: Duration.infinity })).toThrow();
  });
});

describe('AtomEx.makeOwned', () => {
  test('keeps the atom and its value while the owner is alive', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.zero });
    const owner = {};
    const atom = AtomEx.makeOwned(owner, registry, Atom.make(0));

    registry.set(atom, 1);
    await wait(TTL);
    expect(registry.getNodes().has(atom)).toBe(true);
    expect(registry.get(atom)).toBe(1);
    expect(owner).toBeDefined();
  });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
