//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as AtomEx from './AtomEx.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const TTL = 100;

describe('AtomEx.makeRegistry', () => {
  test('keeps an unobserved node for the grace period', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.millis(TTL) });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    await wait(TTL / 4);
    expect(registry.getNodes().size).toBe(1);

    await wait(TTL * 3);
    expect(registry.getNodes().size).toBe(0);
  });

  test('re-subscribing within the grace period keeps the same node', async ({ expect }) => {
    const registry = AtomEx.makeRegistry({ idleTTL: Duration.millis(TTL) });
    const atom = Atom.make(0);

    registry.subscribe(atom, () => {})();
    const node = registry.getNodes().get(atom);
    await wait(TTL / 4);
    const unsubscribe = registry.subscribe(atom, () => {});
    await wait(TTL * 3);
    expect(registry.getNodes().get(atom)).toBe(node);
    unsubscribe();
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
