//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Random } from './hash.ts';
import { type NetworkOptions } from './network.ts';
import { type SyncOptions } from './peer.ts';
import { type InitialConditions, Simulation, expectedDiff, seedPeers } from './simulation.ts';

type SyncResult = {
  simulation: Simulation;
  ticks: number;
};

/** One reconciliation round initiated by A, with no periodic rounds or pushes. */
const initialSync = (
  conditions: InitialConditions,
  { network, sync }: { network?: NetworkOptions; sync?: Partial<SyncOptions> } = {},
): SyncResult => {
  const simulation = new Simulation({ network, sync: { reconcileInterval: 0, ...sync } });
  seedPeers(simulation, conditions);
  simulation.a.reconcile();
  const ticks = simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive);
  return { simulation, ticks };
};

/** Symbols the RIBLT round may use: ~1.35–3× the diff, doubled by the batch schedule, plus slack for tiny diffs. */
const symbolBudget = (diff: number): number => 5 * diff + 8;

const SCENARIOS: [string, InitialConditions][] = [
  ['both empty', {}],
  ['identical (5k docs)', { shared: 5_000 }],
  ['bootstrap: responder has everything', { onlyB: 2_000 }],
  ['bootstrap: initiator has everything', { onlyA: 2_000 }],
  ['disjoint', { onlyA: 500, onlyB: 500 }],
  ['needle in haystack (10k shared, 10 differ)', { shared: 10_000, onlyA: 5, onlyB: 5 }],
  ['A strictly ahead on 50 docs', { shared: 1_000, aheadA: 50 }],
  ['B strictly ahead on 50 docs', { shared: 1_000, aheadB: 50 }],
  ['concurrent edits on 50 docs', { shared: 1_000, concurrent: 50 }],
  ['everything concurrently diverged', { concurrent: 1_000 }],
  ['mixed', { shared: 3_000, onlyA: 20, onlyB: 30, aheadA: 15, aheadB: 25, concurrent: 10, changesPerDoc: 5 }],
];

describe('initial sync', () => {
  test.for(SCENARIOS)('%s', ([, conditions], { expect }) => {
    const { simulation } = initialSync(conditions);
    const { a, network } = simulation;
    expect(simulation.converged()).toBe(true);
    expect(a.stats.roundsCompleted).toBe(1);
    expect(a.stats.diffs).toEqual([expectedDiff(conditions)]);
    expect(network.traffic.symbols).toBeLessThanOrEqual(symbolBudget(expectedDiff(conditions)));
    // Every change crosses the wire at most once.
    expect(a.stats.changesDuplicate + simulation.b.stats.changesDuplicate).toBe(0);
  });

  test('concurrent edits merge into multi-head docs on both sides', ({ expect }) => {
    const { simulation } = initialSync({ concurrent: 20 });
    for (const [docId, heads] of simulation.a.state()) {
      expect(heads).toHaveLength(2);
      expect(simulation.b.heads(docId)).toEqual(heads);
    }
  });

  test('doc sync sends only the missing suffix of each doc', ({ expect }) => {
    const { simulation } = initialSync({ aheadA: 100, changesPerDoc: 10 });
    const extra = simulation.b.stats.changesApplied;
    // `aheadA` adds 1–3 changes per doc; the shared 1–10 change base must not be resent.
    expect(extra).toBeGreaterThanOrEqual(100);
    expect(extra).toBeLessThanOrEqual(300);
    expect(simulation.network.traffic.changes).toBe(extra);
  });

  test('cost scales with the difference, not the collection', ({ expect }) => {
    const symbols = [1_000, 10_000, 50_000].map((shared) => {
      const { simulation } = initialSync({ shared, onlyA: 10, onlyB: 10 });
      return simulation.network.traffic.symbols;
    });
    expect(Math.max(...symbols)).toBeLessThanOrEqual(symbolBudget(20));
  });

  describe('fast initial sync', () => {
    test('size hint lets a bootstrap finish in one symbol trip', ({ expect }) => {
      const hinted = initialSync({ onlyB: 5_000 }, { network: { latency: 10 } });
      const unhinted = initialSync({ onlyB: 5_000 }, { network: { latency: 10 }, sync: { sizeHint: false } });
      expect(hinted.simulation.a.stats.roundTrips).toEqual([1]);
      // Doubling from one symbol to ~7k takes log2(7k) ≈ 13 trips.
      expect(unhinted.simulation.a.stats.roundTrips[0]).toBeGreaterThanOrEqual(10);
      expect(hinted.ticks).toBeLessThan(unhinted.ticks / 3);
    });

    test('a larger first batch trades symbols for round trips', ({ expect }) => {
      const conditions = { shared: 2_000, concurrent: 100 };
      const small = initialSync(conditions, { sync: { initialBatch: 1 } });
      const large = initialSync(conditions, { sync: { initialBatch: 256 } });
      expect(large.simulation.a.stats.roundTrips[0]).toBeLessThan(small.simulation.a.stats.roundTrips[0]);
      expect(large.simulation.network.traffic.symbols).toBeGreaterThanOrEqual(256);
    });

    test.for([1, 3, 10, 25])(
      'latency %i: ticks = latency × (2 × symbol trips + doc-sync hops)',
      (latency, { expect }) => {
        const { simulation, ticks } = initialSync({ shared: 1_000, concurrent: 30 }, { network: { latency } });
        const [trips] = simulation.a.stats.roundTrips;
        // Concurrent docs: done → B's `have` → A's changes → B's changes.
        expect(ticks).toBeLessThanOrEqual(latency * (2 * trips + 4) + 1);
      },
    );
  });

  describe('adverse networks', () => {
    test('jittered latency reorders messages but still converges', ({ expect }) => {
      const { simulation } = initialSync(
        { shared: 2_000, onlyA: 50, onlyB: 50, concurrent: 50 },
        { network: { latency: [1, 30], seed: 7 } },
      );
      expect(simulation.converged()).toBe(true);
    });

    test('lossy link: rounds time out and are retried until converged', ({ expect }) => {
      const simulation = new Simulation({
        network: { latency: 2, dropRate: 0.2, seed: 3 },
        sync: { reconcileInterval: 20, roundTimeout: 10, push: false },
      });
      seedPeers(simulation, { shared: 1_000, onlyA: 40, onlyB: 40, concurrent: 40 });
      simulation.runUntil(() => simulation.converged(), 5_000);
      expect(simulation.a.stats.roundsAbandoned + simulation.b.stats.roundsAbandoned).toBeGreaterThan(0);
    });

    test('both peers initiating at once still converge', ({ expect }) => {
      const simulation = new Simulation({ network: { latency: 5 }, sync: { reconcileInterval: 0 } });
      seedPeers(simulation, { shared: 1_000, onlyA: 100, onlyB: 100, concurrent: 100 });
      simulation.a.reconcile();
      simulation.b.reconcile();
      simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive && !simulation.b.roundActive);
      expect(simulation.a.stats.roundsCompleted).toBe(1);
      expect(simulation.b.stats.roundsCompleted).toBe(1);
    });
  });

  test.for(Array.from({ length: 25 }, (_, index) => index + 1))(
    'random initial conditions (seed %i)',
    (seed, { expect }) => {
      const random = new Random(seed);
      const conditions: InitialConditions = {
        shared: random.int(0, 3_000),
        onlyA: random.int(0, 200),
        onlyB: random.int(0, 200),
        aheadA: random.int(0, 100),
        aheadB: random.int(0, 100),
        concurrent: random.int(0, 100),
        changesPerDoc: random.int(1, 8),
        seed,
      };
      const latency: [number, number] = [random.int(1, 5), random.int(5, 15)];
      const { simulation } = initialSync(conditions, { network: { latency, seed } });
      expect(simulation.converged()).toBe(true);
      expect(simulation.a.stats.diffs).toEqual([expectedDiff(conditions)]);
    },
  );
});
