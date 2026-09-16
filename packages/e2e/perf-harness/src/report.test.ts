//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EVENT_NAME, toPosthogEvent } from './report.ts';
import { type Comparability, type StageRow } from './types.ts';

const comparability: Comparability = {
  servingMode: 'preview',
  pluginSet: 'production',
  profileState: 'first-run',
  settleMs: 20_000,
  instrumented: false,
};

const row = (overrides: Partial<StageRow> = {}): StageRow => ({
  flow: 'projects-tasks',
  stage: 'open-tasks',
  stageIndex: 3,
  mode: 'measure',
  scale: 'tasks=2000,depth=3,projects=5',
  iteration: 0,
  ok: true,
  wallMs: 1234,
  cpuMsTotal: 4321,
  cpuMsByProcess: { 'renderer:42': 3000, 'utility:43': 1321 },
  thread: {
    taskMs: 900,
    scriptMs: 700,
    layoutMs: 120,
    recalcStyleMs: 80,
    v8CompileMs: 10,
    threadTimeMs: 950,
    processTimeMs: 1100,
    layoutCount: 12,
    recalcStyleCount: 30,
  },
  heap: [
    { kind: 'page', name: 'page', usedBytes: 50_000_000, totalBytes: 80_000_000 },
    { kind: 'shared_worker', name: 'shared_worker:worker.js', usedBytes: 120_000_000, totalBytes: 160_000_000 },
  ],
  heapUsedTotalBytes: 170_000_000,
  peakRssBytes: 900_000_000,
  domNodes: 24_000,
  domListeners: 3_100,
  domDocuments: 2,
  network: { codeBytes: 1_000, apiBytes: 2_000, otherBytes: 3, requests: 9, apiRequests: 4 },
  responsiveness: { longTaskCount: 5, longTaskMaxMs: 400, tbtMs: 700, lagP95Ms: 60, lagMaxMs: 812 },
  comparability,
  ...overrides,
});

describe('toPosthogEvent', () => {
  test('carries the trended metrics as flat scalars', ({ expect }) => {
    const event = toPosthogEvent(row());
    expect(event.event).toBe(EVENT_NAME);
    // `ci-event.mjs` flattens only one level, so a nested value here would need `JSONExtract` in
    // every HogQL query that reads it.
    for (const [key, value] of Object.entries(event.properties)) {
      expect(['string', 'number', 'boolean'], `${key} is not a scalar`).toContain(typeof value);
    }
    expect(event.properties.peakRssBytes).toBe(900_000_000);
    expect(event.properties.wallMs).toBe(1234);
    expect(event.properties.domNodes).toBe(24_000);
  });

  test('breaks heap out per target', ({ expect }) => {
    const event = toPosthogEvent(row());
    // The shared worker's heap is its own series: it is the column that moves when a space grows,
    // and a single total would hide it behind the page's.
    expect(event.properties.heapUsed_page).toBe(50_000_000);
    expect(event.properties.heapUsed_shared_worker_worker_js).toBe(120_000_000);
  });

  test('carries the comparability axes', ({ expect }) => {
    const event = toPosthogEvent(row());
    expect(event.properties.servingMode).toBe('preview');
    expect(event.properties.pluginSet).toBe('production');
    expect(event.properties.profileState).toBe('first-run');
    expect(event.properties.settleMs).toBe(20_000);
    expect(event.properties.instrumented).toBe(false);
  });

  test('dedup distinguishes stages of one run', ({ expect }) => {
    // PostHog dedups on (uuid, timestamp, event, distinct_id) and the uuid seed is the commit, so
    // without this every stage of one commit would collapse onto a single row.
    const first = toPosthogEvent(row({ stage: 'open-tasks' }));
    const second = toPosthogEvent(row({ stage: 'filter-tasks' }));
    expect(first.dedup).not.toBe(second.dedup);
  });

  test('refuses a diagnose row', ({ expect }) => {
    // The guard is here rather than in the caller because a diagnose row reaching the trend is a
    // silent error: its CPU carries the profiler's overhead and its memory rises over the run.
    expect(() => toPosthogEvent(row({ mode: 'diagnose' }))).toThrow(/only measure rows/);
  });

  test('keeps the fixture size out of the scale label', ({ expect }) => {
    const event = toPosthogEvent(row({ fixtureSize: 1999 }));
    expect(event.properties.scale).toBe('tasks=2000,depth=3,projects=5');
    expect(event.properties.fixtureSize).toBe(1999);
  });
});
