//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { DEFAULT_ATOM_IDLE_TTL, makeAtomRegistry } from './atom-registry';

/**
 * Node removal is dispatched through the registry's async scheduler, so it needs real macrotask
 * turns rather than a virtual clock.
 */
const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** Interval long enough for a short-TTL bucket to flush, given `timeoutResolution` is half the TTL. */
const SHORT_TTL = 20;
const AFTER_SHORT_TTL = 300;

const nodeCount = (registry: AtomRegistry.AtomRegistry) => registry.getNodes().size;

describe('makeAtomRegistry', () => {
  test('an unsubscribed atom survives the grace period', async () => {
    const registry = makeAtomRegistry();
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await settle(AFTER_SHORT_TTL);

    // The grace period is what makes `keepAlive` unnecessary for an atom that is only briefly
    // unobserved — a remount, or a consumer that reads before it subscribes.
    expect(DEFAULT_ATOM_IDLE_TTL).toBeGreaterThan(AFTER_SHORT_TTL);
    expect(nodeCount(registry)).toBe(1);
  });

  test('a bare registry sweeps immediately — the behaviour this constructor exists to avoid', async () => {
    const registry = AtomRegistry.make();
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await settle();

    expect(nodeCount(registry)).toBe(0);
  });

  test('the grace period elapses and the node is swept', async () => {
    const registry = makeAtomRegistry({ defaultIdleTTL: SHORT_TTL });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await settle(AFTER_SHORT_TTL);

    expect(nodeCount(registry)).toBe(0);
  });

  test('a re-subscribe within the grace period cancels the sweep', async () => {
    const registry = makeAtomRegistry({ defaultIdleTTL: SHORT_TTL });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    const unsubscribe = registry.subscribe(atom, () => {});
    await settle(AFTER_SHORT_TTL);
    expect(nodeCount(registry)).toBe(1);

    unsubscribe();
    await settle(AFTER_SHORT_TTL);
    expect(nodeCount(registry)).toBe(0);
  });

  test('a keepAlive atom is never swept', async () => {
    const registry = makeAtomRegistry({ defaultIdleTTL: SHORT_TTL });
    const atom = Atom.make(0).pipe(Atom.keepAlive);

    registry.subscribe(atom, () => {})();
    await settle(AFTER_SHORT_TTL);

    expect(nodeCount(registry)).toBe(1);
  });
});
