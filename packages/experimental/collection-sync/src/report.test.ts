//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SyncOptions } from './peer.ts';
import { type InitialConditions, Simulation, Workload, expectedDiff, seedPeers } from './simulation.ts';

type Row = Record<string, string | number>;

const LATENCY = 5;

const initialRow = (label: string, conditions: InitialConditions, sync: Partial<SyncOptions> = {}): Row => {
  const simulation = new Simulation({ network: { latency: LATENCY }, sync: { reconcileInterval: 0, ...sync } });
  seedPeers(simulation, conditions);
  simulation.a.reconcile();
  const ticks = simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive);
  const { traffic } = simulation.network;
  const diff = expectedDiff(conditions);
  return {
    'scenario': label,
    'docs': simulation.a.docCount,
    diff,
    ticks,
    'trips': simulation.a.stats.roundTrips[0],
    'symbols': traffic.symbols,
    'symbols/diff': diff === 0 ? '-' : (traffic.symbols / diff).toFixed(2),
    'doc-syncs': traffic.byType['doc-sync'],
    'changes': traffic.changes,
    'kB': (traffic.bytes / 1024).toFixed(1),
  };
};

/** A 1k-doc spike on B after sync, handled by each strategy; measured until converged. */
const spikeRow = (label: string, sync: Partial<SyncOptions>, poll?: number): Row => {
  const simulation = new Simulation({ network: { latency: LATENCY }, sync });
  seedPeers(simulation, { shared: 10_000 });
  simulation.a.reconcile();
  simulation.runUntil(() => simulation.quiescent() && !simulation.a.roundActive);
  simulation.network.resetTraffic();
  new Workload(1).touch(simulation.b, 1_000);
  const ticks = simulation.runUntil(
    () => simulation.converged(),
    5_000,
    (now) => {
      if (poll && now % poll === 0 && !simulation.a.roundActive) {
        simulation.a.reconcile();
      }
    },
  );
  const { traffic } = simulation.network;
  return {
    'strategy': label,
    ticks,
    'messages': traffic.messages,
    'symbols': traffic.symbols,
    'doc-syncs': traffic.byType['doc-sync'],
    'changes': traffic.changes,
    'kB': (traffic.bytes / 1024).toFixed(1),
  };
};

describe('report', () => {
  test('initial sync matrix', ({ expect }) => {
    const rows = [
      initialRow('identical', { shared: 10_000 }),
      initialRow('needle (10 of 10k)', { shared: 10_000, onlyA: 5, onlyB: 5 }),
      initialRow('100 ahead', { shared: 10_000, aheadB: 100 }),
      initialRow('100 concurrent', { shared: 10_000, concurrent: 100 }),
      initialRow('bootstrap 5k', { onlyB: 5_000 }),
      initialRow('bootstrap 5k, no hint', { onlyB: 5_000 }, { sizeHint: false }),
      initialRow('bootstrap 5k, batch 1024', { onlyB: 5_000 }, { sizeHint: false, initialBatch: 1_024 }),
      initialRow('disjoint 2k/2k', { onlyA: 2_000, onlyB: 2_000 }),
    ];
    console.log(`\nInitial sync (latency ${LATENCY} ticks)`);
    console.table(rows);
    expect(rows).toHaveLength(8);
  });

  test('1k-doc spike after sync, by strategy', ({ expect }) => {
    const rows = [
      spikeRow('push', { reconcileInterval: 0 }),
      spikeRow('push, budget 50/tick', { reconcileInterval: 0, pushBudget: 50 }),
      spikeRow('RIBLT poll every 20', { reconcileInterval: 0, push: false }, 20),
      spikeRow('RIBLT poll, batch 256', { reconcileInterval: 0, push: false, initialBatch: 256 }, 20),
      spikeRow('push + RIBLT every 20', { reconcileInterval: 20 }),
    ];
    console.log(`\n1k-doc spike on B after sync (10k docs, latency ${LATENCY} ticks)`);
    console.table(rows);
    expect(rows).toHaveLength(5);
  });
});
