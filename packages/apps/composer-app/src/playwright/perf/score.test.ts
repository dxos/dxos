//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'vitest';

import { parseBudgets } from '@dxos/perf-harness/score';

import { RUN_GROUP, STAGE_WALL_GROUP, type StageEvent, groupOfId, toMeasurements } from './score.ts';

const row = (iteration: number, stage: string, properties: Record<string, number> = {}): StageEvent => ({
  properties: { stage, iteration, wallMs: 100, cpuMsTotal: 200, ...properties },
});

describe('perf score measurements', () => {
  test('takes the median of each stage across iterations', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot', { wallMs: 100 }),
      row(1, 'boot', { wallMs: 300 }),
      row(2, 'boot', { wallMs: 200 }),
    ]);
    expect(measurements).toContainEqual({ id: 'wall > boot', group: STAGE_WALL_GROUP, value: 200 });
  });

  test('reduces a level by the worst stage and a cost by the sum, per iteration', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot', { heapUsedBytesTab: 10, embedderBytesTab: 1, wasmBytesTab: 2, wasmRealms: 1, tbtMs: 5 }),
      row(0, 'open-tasks', { heapUsedBytesTab: 30, embedderBytesTab: 1, wasmBytesTab: 2, wasmRealms: 1, tbtMs: 7 }),
    ]);
    // Realm memory sums heap, embedder and wasm within a stage, then takes the worst stage.
    expect(measurements).toContainEqual({ id: 'run > peak tab realm memory', group: RUN_GROUP, value: 33 });
    expect(measurements).toContainEqual({ id: 'run > total blocking time', group: RUN_GROUP, value: 12 });
  });

  test('ignores a footprint reading from a stage that read no processes', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot', { appFootprintBytes: 0, footprintProcesses: 0 }),
      row(0, 'open-tasks', { appFootprintBytes: 50, footprintProcesses: 3 }),
    ]);
    expect(measurements).toContainEqual({ id: 'run > peak app footprint', group: RUN_GROUP, value: 50 });
  });

  test('every committed budget is a valid range in a known group', ({ expect }) => {
    const budgets = parseBudgets(JSON.parse(readFileSync(path.join(import.meta.dirname, 'budgets.json'), 'utf8')));
    const groups = new Set(Object.keys(budgets).map(groupOfId));
    expect([...groups].sort()).toEqual(['run', 'stage CPU', 'stage wall time']);
  });
});
