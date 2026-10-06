//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  COSTED_WORK_METRICS,
  RUN_GROUP,
  STAGE_WALL_GROUP,
  type StageEvent,
  WORK_GROUP,
  groupOfId,
  parseStageEvent,
  toMeasurements,
} from './stages.ts';

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

  test('scores request latency only from stages that asked a model, as the median across iterations', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot'),
      row(0, 'assistant-turns', { turnToRequestP50Ms: 80, turnToRequestMaxMs: 400, turnToRequestCount: 20 }),
      row(1, 'assistant-turns', { turnToRequestP50Ms: 120, turnToRequestMaxMs: 200, turnToRequestCount: 20 }),
      row(2, 'assistant-turns', { turnToRequestP50Ms: 100, turnToRequestMaxMs: 300, turnToRequestCount: 20 }),
    ]);
    expect(measurements).toContainEqual({ id: 'run > turn to request p50', group: RUN_GROUP, value: 100 });
    expect(measurements).toContainEqual({ id: 'run > turn to request max', group: RUN_GROUP, value: 300 });
    expect(measurements.map(({ id }) => id)).not.toContain('run > submit to request p50');
  });

  test('takes the median of each work counter per stage, summing its keys within a row', ({ expect }) => {
    const saves = (snapshot: number, incremental: number) => ({
      automergeSnapshotSaves: snapshot,
      automergeIncrementalSaves: incremental,
      dataRealms: 2,
    });
    const measurements = toMeasurements([
      row(0, 'boot', { reactRenders: 10, ...saves(1, 2) }),
      row(1, 'boot', { reactRenders: 30, ...saves(2, 4) }),
      row(2, 'boot', { reactRenders: 20, ...saves(1, 1) }),
    ]);
    expect(measurements).toContainEqual({ id: 'reactRenders > boot', group: WORK_GROUP, value: 20 });
    expect(measurements).toContainEqual({ id: 'automergeSaves > boot', group: WORK_GROUP, value: 3 });
  });

  test('measures no work counter whose instrument did not run', ({ expect }) => {
    const ids = toMeasurements([row(0, 'boot', { sqliteInserts: 0, dataRealms: 0 })]).map(({ id }) => id);
    expect(ids).not.toContain('sqliteInserts > boot');
    expect(ids).not.toContain('reactRenders > boot');
  });

  test('measures only the work counters asked for, without timings when they are off', ({ expect }) => {
    const ids = toMeasurements(
      [row(0, 'scroll', { reactRenders: 5, styleRecalcElements: 40, traceCounterEvents: 900 })],
      { work: COSTED_WORK_METRICS, timings: false },
    ).map(({ id }) => id);
    expect(ids).toEqual(['styleRecalcElements > scroll']);
  });

  test('names the work group from the counter before the stage', ({ expect }) => {
    expect(groupOfId('reactRenders > boot')).toBe(WORK_GROUP);
    expect(groupOfId('jsCalls > scroll-thread')).toBe(WORK_GROUP);
    expect(groupOfId('wall > boot')).toBe(STAGE_WALL_GROUP);
    expect(groupOfId('run > peak app footprint')).toBe(RUN_GROUP);
  });

  test('rejects a batch line that is not flat scalar properties', ({ expect }) => {
    expect(parseStageEvent({ properties: { stage: 'boot', wallMs: 1 } })).toEqual({
      properties: { stage: 'boot', wallMs: 1 },
    });
    expect(() => parseStageEvent({})).toThrow();
    expect(() => parseStageEvent({ properties: { nested: { wallMs: 1 } } })).toThrow();
  });
});
