//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import * as AtomEx from './AtomEx.ts';

const TTL = 100;

// Fake timers make the idle-TTL grace period (a real `setTimeout` inside the registry) deterministic
// instead of racing a real wall-clock wait.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AtomEx.makeRegistry', () => {
  test('keeps an unobserved node through the grace period', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.millis(TTL) });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    const node = registry.getNodes().get(atom);
    // Past the task on which a registry without a TTL removes the node.
    await vi.advanceTimersByTimeAsync(TTL / 4);
    const unsubscribe = registry.subscribe(atom, () => {});
    expect(registry.getNodes().get(atom)).toBe(node);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(TTL * 3);
    expect(registry.getNodes().size).toBe(0);
  });

  test('a zero grace period removes on the next task', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.zero });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await vi.advanceTimersByTimeAsync(TTL / 4);
    expect(registry.getNodes().size).toBe(0);
  });

  test('rejects an infinite grace period', ({ expect }) => {
    expect(() => AtomEx.makeRegistry({ idleTTL: Duration.infinity })).toThrow();
  });
});

describe('AtomEx.makeOwned', () => {
  test('keeps the atom and its value while the owner is alive', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.zero });
    const owner = new TestOwner(registry);
    const atom = AtomEx.makeOwned(owner, Atom.make(0));

    registry.set(atom, 1);
    await vi.advanceTimersByTimeAsync(TTL);
    expect(registry.getNodes().has(atom)).toBe(true);
    expect(registry.get(atom)).toBe(1);
    expect(owner).toBeDefined();
  });
});

class TestOwner implements AtomEx.Owner {
  static readonly #finalizer = new FinalizationRegistry<() => void>((unmount) => unmount());

  readonly [AtomEx.OwnerId]: AtomEx.Owner[typeof AtomEx.OwnerId];

  constructor(registry: Registry.AtomRegistry) {
    this[AtomEx.OwnerId] = { registry, finalizer: TestOwner.#finalizer };
  }
}
