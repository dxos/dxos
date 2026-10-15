//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { hashString } from './hash.ts';
import { type Item, RibltDecoder, type SymbolSource, encodeSet } from './riblt.ts';

const items = (prefix: string, count: number): Item[] =>
  Array.from({ length: count }, (_, index) => hashString(`${prefix}-${index}`));

/** Streams symbols from `remote` into a decoder over `local` until decoded; returns the decoder. */
const reconcile = (remote: SymbolSource, local: SymbolSource, limit = 100_000): RibltDecoder => {
  const decoder = new RibltDecoder(local);
  while (!decoder.decoded) {
    if (decoder.count >= limit) {
      throw new Error('Did not decode.');
    }
    decoder.add(remote.symbol(decoder.count));
  }
  return decoder;
};

const sorted = (values: readonly Item[]): Item[] => [...values].sort((left, right) => (left < right ? -1 : 1));

describe('riblt', () => {
  test('identical sets decode from a single symbol', ({ expect }) => {
    const shared = items('shared', 10_000);
    const decoder = reconcile(encodeSet(shared), encodeSet(shared));
    expect(decoder.count).toBe(1);
    expect(decoder.remoteOnly).toHaveLength(0);
    expect(decoder.localOnly).toHaveLength(0);
  });

  test('two empty sets decode from a single symbol', ({ expect }) => {
    expect(reconcile(encodeSet([]), encodeSet([])).count).toBe(1);
  });

  test('recovers both directions of the difference', ({ expect }) => {
    const shared = items('shared', 1_000);
    const remoteExtra = items('remote', 40);
    const localExtra = items('local', 25);
    const decoder = reconcile(encodeSet([...shared, ...remoteExtra]), encodeSet([...shared, ...localExtra]));
    expect(sorted(decoder.remoteOnly)).toEqual(sorted(remoteExtra));
    expect(sorted(decoder.localOnly)).toEqual(sorted(localExtra));
  });

  test('empty remote: everything is local-only', ({ expect }) => {
    const local = items('local', 500);
    const decoder = reconcile(encodeSet([]), encodeSet(local));
    expect(sorted(decoder.localOnly)).toEqual(sorted(local));
  });

  // Overhead = symbols / diff. The paper reports → 1.35 for large d, higher for small d.
  test.for([1, 2, 5, 10, 50, 100, 1_000, 5_000])('overhead for d=%i is bounded', (diff, { expect }) => {
    const trials = diff >= 1_000 ? 2 : 10;
    let total = 0;
    for (let trial = 0; trial < trials; trial++) {
      const shared = items(`shared-${trial}`, 2_000);
      const remoteExtra = items(`remote-${trial}`, Math.ceil(diff / 2));
      const localExtra = items(`local-${trial}`, Math.floor(diff / 2));
      const decoder = reconcile(encodeSet([...shared, ...remoteExtra]), encodeSet([...shared, ...localExtra]));
      expect(decoder.remoteOnly.length + decoder.localOnly.length).toBe(diff);
      total += decoder.count;
    }
    const overhead = total / trials / diff;
    expect(overhead).toBeLessThan(diff <= 5 ? 4 : diff <= 100 ? 2.2 : 1.6);
  });

  test('cost is independent of set size', ({ expect }) => {
    const counts = [100, 1_000, 20_000].map((size) => {
      const shared = items(`shared-${size}`, size);
      return reconcile(encodeSet([...shared, ...items('extra', 20)]), encodeSet(shared)).count;
    });
    // Same 20 extra items, so the same cells: set size contributes nothing.
    expect(new Set(counts).size).toBe(1);
  });

  describe('incremental encoder', () => {
    test('add/remove after symbols are cached matches a fresh encoding', ({ expect }) => {
      const initial = items('initial', 300);
      const live = encodeSet(initial);
      for (let index = 0; index < 500; index++) {
        live.symbol(index);
      }
      const added = items('added', 50);
      added.forEach((item) => live.add(item));
      initial.slice(0, 100).forEach((item) => live.remove(item));

      const fresh = encodeSet([...initial.slice(100), ...added]);
      for (let index = 0; index < 800; index++) {
        expect(live.symbol(index)).toEqual(fresh.symbol(index));
      }
    });

    test('snapshot keeps serving the set as of when it was taken', ({ expect }) => {
      const initial = items('initial', 200);
      const live = encodeSet(initial);
      live.symbol(10);
      const snapshot = live.snapshot();
      live.add(hashString('late-1'));
      live.remove(initial[0]);
      live.add(hashString('late-2'));
      live.remove(hashString('late-2'));

      const frozen = encodeSet(initial);
      for (let index = 0; index < 300; index++) {
        expect(snapshot.symbol(index)).toEqual(frozen.symbol(index));
      }
      expect(snapshot.size).toBe(200);
      expect(snapshot.changes).toBe(2);
      snapshot.close();
      expect(live.openSnapshots).toBe(0);
    });

    test('mutating both sides mid-stream still decodes the snapshots consistently', ({ expect }) => {
      const shared = items('shared', 1_000);
      const remote = encodeSet([...shared, ...items('remote', 30)]);
      const local = encodeSet([...shared, ...items('local', 30)]);
      const remoteSnapshot = remote.snapshot();
      const localSnapshot = local.snapshot();
      const decoder = new RibltDecoder(localSnapshot);
      let step = 0;
      while (!decoder.decoded) {
        decoder.add(remoteSnapshot.symbol(decoder.count));
        // Churn on both live encoders while the round is in flight.
        remote.add(hashString(`churn-remote-${step}`));
        local.add(hashString(`churn-local-${step}`));
        step++;
      }
      expect(decoder.remoteOnly).toHaveLength(30);
      expect(decoder.localOnly).toHaveLength(30);
    });
  });
});
