//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Random } from './hash.ts';
import { type NetworkOptions } from './network.ts';
import { type SyncOptions } from './peer.ts';
import { type InitialConditions, Simulation, Workload, seedPeers } from './simulation.ts';

/** Two peers that have completed initial sync; traffic counters are reset afterwards. */
const synced = (
  conditions: InitialConditions = { shared: 2_000 },
  { network, sync }: { network?: NetworkOptions; sync?: Partial<SyncOptions> } = {},
): Simulation => {
  const simulation = new Simulation({ network, sync });
  seedPeers(simulation, conditions);
  simulation.a.reconcile();
  simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive);
  simulation.network.resetTraffic();
  return simulation;
};

describe('incremental sync', () => {
  describe('push', () => {
    test('a single edit reaches the remote in one hop carrying one change', ({ expect }) => {
      const simulation = synced({ shared: 2_000 }, { network: { latency: 4 }, sync: { reconcileInterval: 0 } });
      simulation.a.edit('doc-000042');
      const ticks = simulation.runUntil(() => simulation.quiescent());
      expect(ticks).toBe(5);
      expect(simulation.network.traffic.byType['doc-sync']).toBe(1);
      expect(simulation.network.traffic.changes).toBe(1);
    });

    test('new docs created after sync propagate', ({ expect }) => {
      const simulation = synced({ shared: 100 }, { sync: { reconcileInterval: 0 } });
      simulation.a.edit('fresh-a', 3);
      simulation.b.edit('fresh-b', 2);
      simulation.runUntil(() => simulation.quiescent());
      expect(simulation.a.docCount).toBe(102);
    });

    test('steady low-rate edits on both sides converge within two hops of the last edit', ({ expect }) => {
      const latency = 3;
      const simulation = synced({ shared: 1_000 }, { network: { latency } });
      const workloadA = new Workload(1);
      const workloadB = new Workload(2);
      simulation.run(1_000, () => {
        workloadA.poisson(simulation.a, 0.5);
        workloadB.poisson(simulation.b, 0.5);
      });
      expect(simulation.runUntil(() => simulation.converged())).toBeLessThanOrEqual(2 * latency + 1);
    });

    test('concurrent edits to the same docs merge', ({ expect }) => {
      const simulation = synced({ shared: 500 }, { network: { latency: 5 } });
      const workload = new Workload(3);
      const docs = workload.touch(simulation.a, 100);
      docs.forEach((docId) => simulation.b.edit(docId));
      simulation.runUntil(() => simulation.quiescent());
      for (const docId of docs) {
        expect(simulation.a.heads(docId)).toHaveLength(2);
      }
    });
  });

  describe('activity spikes after sync', () => {
    test('unbounded push drains a 2k-doc spike in one hop', ({ expect }) => {
      const simulation = synced({ shared: 5_000 }, { network: { latency: 5 }, sync: { reconcileInterval: 0 } });
      new Workload(4).touch(simulation.a, 2_000);
      expect(simulation.runUntil(() => simulation.quiescent())).toBe(6);
      expect(simulation.network.traffic.byType['doc-sync']).toBe(2_000);
    });

    test('push budget spreads a spike over ticks (backpressure)', ({ expect }) => {
      const simulation = synced(
        { shared: 5_000 },
        { network: { latency: 5 }, sync: { reconcileInterval: 0, pushBudget: 100 } },
      );
      new Workload(4).touch(simulation.a, 2_000);
      const ticks = simulation.runUntil(() => simulation.quiescent());
      // 20 ticks to drain the queue, then the last batch is in flight for 5.
      expect(ticks).toBeGreaterThanOrEqual(24);
      expect(ticks).toBeLessThanOrEqual(26);
    });

    test('push delay coalesces repeated edits to hot docs', ({ expect }) => {
      const run = (pushDelay: number): number => {
        const simulation = synced({ shared: 1_000 }, { sync: { reconcileInterval: 0, pushDelay } });
        const workload = new Workload(5, 0);
        const hot = workload.random.sample([...simulation.a.state().keys()], 50);
        simulation.run(20, () => {
          for (let index = 0; index < 25; index++) {
            simulation.a.edit(workload.random.pick(hot));
          }
        });
        simulation.runUntil(() => simulation.quiescent());
        return simulation.network.traffic.byType['doc-sync'];
      };
      const eager = run(0);
      const coalesced = run(10);
      expect(coalesced).toBeLessThan(eager / 3);
    });

    test('RIBLT-only mode (no push) absorbs a spike in one round sized to the spike', ({ expect }) => {
      const simulation = synced(
        { shared: 5_000 },
        { network: { latency: 2 }, sync: { push: false, reconcileInterval: 0 } },
      );
      const roundsBefore = simulation.a.stats.diffs.length;
      // Only A polls, every 20 ticks unless a round is running: equal set sizes give no size hint, so this round
      // doubles its way up over ~11 trips and would be abandoned by a blind restart.
      new Workload(6).touch(simulation.b, 500);
      simulation.runUntil(
        () => simulation.quiescent(),
        200,
        (now) => {
          if (now % 20 === 0 && !simulation.a.roundActive) {
            simulation.a.reconcile();
          }
        },
      );
      const diffs = simulation.a.stats.diffs.slice(roundsBefore).filter((diff) => diff > 0);
      // Each touched doc is one item on each side.
      expect(diffs).toEqual([1_000]);
      expect(simulation.network.traffic.symbols).toBeLessThanOrEqual(5 * 1_000 + 8 + 20);
    });

    test('spikes on both sides over overlapping docs', ({ expect }) => {
      const simulation = synced({ shared: 3_000 }, { network: { latency: [1, 8], seed: 9 } });
      const workload = new Workload(7);
      const touchedA = workload.touch(simulation.a, 800);
      const touchedB = workload.touch(simulation.b, 800);
      simulation.runUntil(() => simulation.quiescent());
      const both = touchedA.filter((docId) => touchedB.includes(docId));
      expect(both.length).toBeGreaterThan(0);
      for (const docId of both) {
        expect(simulation.a.heads(docId)).toHaveLength(2);
      }
    });

    test('spike while the initial sync round is still in flight', ({ expect }) => {
      const simulation = new Simulation({ network: { latency: 10 }, sync: { reconcileInterval: 40 } });
      seedPeers(simulation, { shared: 2_000, onlyA: 300, onlyB: 300, concurrent: 200 });
      simulation.a.reconcile();
      const workloadA = new Workload(8);
      const workloadB = new Workload(9);
      simulation.run(30, () => {
        workloadA.apply(simulation.a, 20);
        workloadB.apply(simulation.b, 20);
      });
      simulation.runUntil(() => simulation.quiescent());
      expect(simulation.converged()).toBe(true);
    });
  });

  describe('anti-entropy', () => {
    test('idle steady state costs one symbol per round', ({ expect }) => {
      const simulation = synced({ shared: 10_000 }, { network: { latency: 2 }, sync: { reconcileInterval: 50 } });
      const before = simulation.peers.map((peer) => peer.stats.roundSymbols.length);
      simulation.run(1_000);
      const rounds = simulation.peers.flatMap((peer, index) => peer.stats.roundSymbols.slice(before[index]));
      // Both peers poll every 50 ticks.
      expect(rounds.length).toBeGreaterThanOrEqual(38);
      expect(new Set(rounds)).toEqual(new Set([1]));
      expect(simulation.network.traffic.symbols).toBeLessThanOrEqual(rounds.length + 2);
      expect(simulation.network.traffic.byType['doc-sync']).toBe(0);
    });

    test('lost pushes are never repaired without anti-entropy', ({ expect }) => {
      const simulation = synced({ shared: 1_000 }, { sync: { reconcileInterval: 0 } });
      simulation.network.dropRate = 1;
      new Workload(10).touch(simulation.b, 50);
      simulation.run(5);
      simulation.network.dropRate = 0;
      simulation.run(500);
      expect(simulation.converged()).toBe(false);
    });

    test('lost pushes are repaired by the next round', ({ expect }) => {
      const simulation = synced({ shared: 1_000 }, { sync: { reconcileInterval: 30, roundTimeout: 10 } });
      simulation.network.dropRate = 1;
      new Workload(10).touch(simulation.b, 50);
      simulation.run(5);
      simulation.network.dropRate = 0;
      // A round lost in the window must time out before the next one starts.
      expect(simulation.runUntil(() => simulation.converged())).toBeLessThanOrEqual(30 + 10 + 10);
    });

    test('partition then heal: one round sized to what changed during the partition', ({ expect }) => {
      const simulation = synced({ shared: 5_000 }, { network: { latency: 3 }, sync: { reconcileInterval: 0 } });
      simulation.setConnected(false);
      const touchedA = new Workload(11, 0).touch(simulation.a, 150);
      const touchedB = new Workload(12, 0).touch(simulation.b, 150);
      simulation.run(200);
      const roundsBefore = simulation.a.stats.diffs.length;
      simulation.setConnected(true);
      simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive);
      const changed = new Set([...touchedA, ...touchedB]).size;
      expect(simulation.a.stats.diffs.slice(roundsBefore)).toEqual([2 * changed]);
    });

    test('lossy link with continuous edits converges once edits stop', ({ expect }) => {
      const simulation = synced(
        { shared: 1_000 },
        { network: { latency: [1, 6], dropRate: 0.1, seed: 13 }, sync: { reconcileInterval: 25, roundTimeout: 20 } },
      );
      const workloadA = new Workload(14);
      const workloadB = new Workload(15);
      simulation.run(500, () => {
        workloadA.poisson(simulation.a, 1);
        workloadB.poisson(simulation.b, 1);
      });
      simulation.runUntil(() => simulation.converged(), 500);
    });
  });

  test.for(Array.from({ length: 20 }, (_, index) => index + 1))(
    'fuzz: random workload and network (seed %i)',
    (seed, { expect }) => {
      const random = new Random(seed * 101);
      const simulation = new Simulation({
        network: { latency: [1, random.int(1, 20)], dropRate: random.pick([0, 0, 0.05, 0.2]), seed },
        sync: {
          reconcileInterval: random.pick([10, 50, 200]),
          push: random.next() < 0.8,
          pushDelay: random.int(0, 5),
          pushBudget: random.pick([Infinity, 10, 50]),
          roundTimeout: 60,
        },
      });
      seedPeers(simulation, { shared: random.int(0, 2_000), onlyA: random.int(0, 50), onlyB: random.int(0, 50), seed });
      const workloadA = new Workload(seed, random.next() * 0.3);
      const workloadB = new Workload(seed + 1000, random.next() * 0.3);
      simulation.run(400, (now) => {
        // Background activity with occasional spikes.
        workloadA.poisson(simulation.a, 0.3);
        workloadB.poisson(simulation.b, 0.3);
        if (random.next() < 0.01) {
          workloadA.apply(simulation.a, random.int(50, 300));
        }
        if (now % 97 === 0) {
          simulation.setConnected(random.next() < 0.7);
        }
      });
      if (!simulation.network.connected) {
        simulation.setConnected(true);
      }
      simulation.network.dropRate = 0;
      simulation.runUntil(() => simulation.converged(), 2_000);
      expect(simulation.converged()).toBe(true);
    },
  );
});
