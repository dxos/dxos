//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { RUN_GROUP, STAGE_WALL_GROUP, type StageEvent, parseStageEvent, toMeasurements } from './stages.ts';

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

  test('scores submit-to-visible from the one stage that measured it', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot'),
      row(0, 'assistant-turns', { submitToQueuedVisibleMs: 14 }),
      row(1, 'assistant-turns', { submitToQueuedVisibleMs: 18 }),
      row(2, 'assistant-turns', { submitToQueuedVisibleMs: 16 }),
    ]);
    expect(measurements).toContainEqual({ id: 'run > submit to queued visible', group: RUN_GROUP, value: 16 });
  });

  test('ignores a footprint reading from a stage that read no processes', ({ expect }) => {
    const measurements = toMeasurements([
      row(0, 'boot', { appFootprintBytes: 0, footprintProcesses: 0 }),
      row(0, 'open-tasks', { appFootprintBytes: 50, footprintProcesses: 3 }),
    ]);
    expect(measurements).toContainEqual({ id: 'run > peak app footprint', group: RUN_GROUP, value: 50 });
  });

  test('rejects a batch line that is not flat scalar properties', ({ expect }) => {
    expect(parseStageEvent({ properties: { stage: 'boot', wallMs: 1 } })).toEqual({
      properties: { stage: 'boot', wallMs: 1 },
    });
    expect(() => parseStageEvent({})).toThrow();
    expect(() => parseStageEvent({ properties: { nested: { wallMs: 1 } } })).toThrow();
  });
});
