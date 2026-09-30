//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'vitest';

import { EVENT_NAME, toPosthogEvent, writePosthogBatch } from './report.ts';
import { type Comparability, type StageRow } from './types.ts';

/** Zeroed so a row fixture states only the fields its assertion is about. */
const EMPTY_REALM_THREAD = {
  taskMs: 0,
  scriptMs: 0,
  layoutMs: 0,
  recalcStyleMs: 0,
  v8CompileMs: 0,
  threadTimeMs: 0,
  processTimeMs: 0,
  layoutCount: 0,
  recalcStyleCount: 0,
};

const comparability: Comparability = {
  servingMode: 'preview',
  pluginSet: 'production',
  profileState: 'first-run',
  settleMs: 20_000,
  instruments: 'profiler',
};

describe('toPosthogEvent', () => {
  test('carries the trended metrics as flat scalars', ({ expect }) => {
    const event = toPosthogEvent(row());
    expect(event.event).toBe(EVENT_NAME);
    // `ci-event.mjs` flattens only one level, so a nested value here would need `JSONExtract` in
    // every HogQL query that reads it.
    for (const [key, value] of Object.entries(event.properties)) {
      expect(['string', 'number', 'boolean'], `${key} is not a scalar`).toContain(typeof value);
    }
    expect(event.properties.appFootprintBytes).toBe(420_000_000);
    // Chrome's own processes are reported, and reported separately.
    expect(event.properties.chromeFootprintBytes).toBe(80_000_000);
    expect(event.properties.wallMs).toBe(1234);
    expect(event.properties.domNodes).toBe(24_000);
  });

  test('breaks heap out per realm, into fixed columns', ({ expect }) => {
    const event = toPosthogEvent(row());
    // The shared worker's heap is its own series: it is the column that moves when a space grows,
    // and a single total would hide it behind the tab's.
    expect(event.properties.heapUsedBytesTab).toBe(50_000_000);
    expect(event.properties.heapUsedBytesSharedWorker).toBe(120_000_000);
    // Present and zero rather than absent, so a chart's series never gaps on a realm that a
    // particular run did not create.
    expect(event.properties.heapUsedBytesServiceWorker).toBe(0);
  });

  test('carries the comparability axes', ({ expect }) => {
    const event = toPosthogEvent(row());
    expect(event.properties.servingMode).toBe('preview');
    expect(event.properties.pluginSet).toBe('production');
    expect(event.properties.profileState).toBe('first-run');
    expect(event.properties.settleMs).toBe(20_000);
    expect(event.properties.instruments).toBe('profiler');
  });

  test('dedup distinguishes stages of one run', ({ expect }) => {
    // PostHog dedups on (uuid, timestamp, event, distinct_id) and the uuid seed is the commit, so
    // without this every stage of one commit would collapse onto a single row.
    const first = toPosthogEvent(row({ stage: 'open-tasks' }));
    const second = toPosthogEvent(row({ stage: 'filter-tasks' }));
    expect(first.dedup).not.toBe(second.dedup);
  });

  test('refuses a failed stage', ({ expect }) => {
    // A failed stage's `wallMs` IS its locator budget, in the units the trend is read in, so
    // publishing one invents a regression that no code change caused.
    expect(() => toPosthogEvent(row({ ok: false, wallMs: 60_000, error: 'locator timeout' }))).toThrow(/failed stage/);
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

describe('writePosthogBatch', () => {
  test('accumulates across iterations rather than truncating', ({ expect }) => {
    // The regression this exists for: the batch name carries the flow and mode but NOT the
    // iteration, so a truncating write made each of the nightly's ten iterations overwrite the
    // last. A run that measured 100 stages published 10 — the iteration that happened to finish
    // last — and the loss was invisible, because the log still read "captured 10 event(s)".
    const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'perf-batch-'));

    const file = writePosthogBatch(workspaceRoot, 'flow-measure', [row({ stage: 'boot', iteration: 0 })]);
    writePosthogBatch(workspaceRoot, 'flow-measure', [row({ stage: 'boot', iteration: 1 })]);

    const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => JSON.parse(line).properties.iteration)).toEqual([0, 1]);
  });

  test('a diagnose or failed row still writes nothing', ({ expect }) => {
    // Appending must not weaken the two guards: an empty batch appends only its newline.
    const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'perf-batch-'));

    const file = writePosthogBatch(workspaceRoot, 'flow-measure', [row({ mode: 'diagnose' }), row({ ok: false })]);

    expect(readFileSync(file, 'utf8').split('\n').filter(Boolean)).toHaveLength(0);
  });
});

describe('disk columns', () => {
  test('an uninstrumented run is distinguishable from one that did no I/O', ({ expect }) => {
    // Both report zero bytes, and they are different facts: the first means the VFS wrapper never
    // published its counters (a broken harness), the second means SQLite genuinely touched
    // nothing (a real, interesting result). `sqliteRealms` is the only thing that separates them.
    const uninstrumented = toPosthogEvent(
      row({ disk: { readBytes: 0, writeBytes: 0, reads: 0, writes: 0, syncs: 0, realms: 0 } }),
    );
    const idle = toPosthogEvent(
      row({ disk: { readBytes: 0, writeBytes: 0, reads: 0, writes: 0, syncs: 0, realms: 1 } }),
    );

    expect(uninstrumented.properties.sqliteReadBytes).toBe(0);
    expect(idle.properties.sqliteReadBytes).toBe(0);
    expect(uninstrumented.properties.sqliteRealms).toBe(0);
    expect(idle.properties.sqliteRealms).toBe(1);
  });
});

describe('memory columns', () => {
  test('wasm linear memory is its own per-realm series', ({ expect }) => {
    // No heap column counts it — `usedBytes` is the V8 heap and a wasm module's memory lives
    // outside it — so before this a worker holding 64 MB of automerge read as 120 MB total.
    const event = toPosthogEvent(row());
    expect(event.properties.wasmBytesTab).toBe(16_777_216);
    expect(event.properties.wasmBytesSharedWorker).toBe(67_108_864);
    expect(event.properties.wasmBytesWorker).toBe(0);
    expect(event.properties.wasmBytesTotal).toBe(83_886_080);
  });

  test('shared wasm memory is reported beside the total, never folded into it', ({ expect }) => {
    // One `SharedArrayBuffer`-backed memory is visible in every realm it was posted to, and
    // nothing in the readings identifies one allocation across realms — so the total carries the
    // EXCLUSIVE bytes only. Taking the largest realm's shared subtotal as the union undercounted
    // whenever two realms held different shared memories: 2 MB and 3 MB is 5 MB, not 3 MB.
    const event = toPosthogEvent(
      row({
        heap: [
          { kind: 'page', name: 'page', usedBytes: 1, totalBytes: 2, wasmBytes: 5, wasmSharedBytes: 2 },
          { kind: 'worker', name: 'worker', usedBytes: 1, totalBytes: 2, wasmBytes: 8, wasmSharedBytes: 3 },
        ],
      }),
    );

    expect(event.properties.wasmBytesTotal).toBe(8);
    expect(event.properties.wasmSharedBytesSum).toBe(5);
  });

  test('a failed footprint read is legible as absent rather than as zero memory', ({ expect }) => {
    // The memory-infra dump can fail or be pre-empted by another trace, and an empty reading sums
    // to zero bytes — indistinguishable from an app holding no memory without this column.
    const collected = toPosthogEvent(row());
    const failed = toPosthogEvent(row({ footprint: [], appFootprintBytes: 0 }));

    expect(collected.properties.footprintProcesses as number).toBeGreaterThan(0);
    expect(failed.properties.footprintProcesses).toBe(0);
    expect(failed.properties.appFootprintBytes).toBe(0);
  });

  test('an uninstrumented realm is distinguishable from one holding no wasm', ({ expect }) => {
    const uninstrumented = toPosthogEvent(row({ heap: [{ kind: 'page', name: 'page', usedBytes: 1, totalBytes: 2 }] }));
    const empty = toPosthogEvent(
      row({ heap: [{ kind: 'page', name: 'page', usedBytes: 1, totalBytes: 2, wasmBytes: 0, wasmInstances: 0 }] }),
    );

    expect(uninstrumented.properties.wasmBytesTotal).toBe(0);
    expect(empty.properties.wasmBytesTotal).toBe(0);
    expect(uninstrumented.properties.wasmRealms).toBe(0);
    expect(empty.properties.wasmRealms).toBe(1);
  });

  test('backing stores are published beside the heap', ({ expect }) => {
    // Automerge moves documents as `Uint8Array`s, whose bytes are a backing store rather than heap.
    const event = toPosthogEvent(row());
    expect(event.properties.heapBackingBytesTab).toBe(4_000_000);
    expect(event.properties.heapBackingBytesSharedWorker).toBe(9_000_000);
  });
});

describe('rpc columns', () => {
  test('queue wait is attributed to the realm that served the call', ({ expect }) => {
    // Queue wait IS the serving realm's event-loop lag, measured from real traffic: a pooled
    // figure would let the tab's calm dilute a worker that blocked for 380 ms.
    const event = toPosthogEvent(row());
    expect(event.properties.rpcQueueWaitMaxMsWorker).toBe(380);
    expect(event.properties.rpcQueueWaitP95MsWorker).toBe(55);
    expect(event.properties.rpcQueueWaitMaxMsTab).toBe(0);
    expect(event.properties.rpcCallsWorker).toBe(140);
  });

  test('round trip is attributed to the realm that issued the call', ({ expect }) => {
    // The caller's quantity, and not derivable from the server's two: it adds the transport in
    // both directions, which is where a 460 ms wait behind a 120 ms handler went.
    const event = toPosthogEvent(row());
    expect(event.properties.rpcRoundTripMaxMsTab).toBe(460);
    expect(event.properties.rpcRoundTripMaxMsWorker).toBe(0);
  });

  test('a truncated sample ring is visible rather than silent', ({ expect }) => {
    // The middleware keeps a bounded ring, so a stage serving more calls than it holds reports a
    // percentile over the stage's tail. `rpcCallsTotal` above `rpcSamples` is what says so — and
    // the two must count the SAME ring: summing served and client samples into one column let the
    // 100 client samples mask a server ring truncated at 100 against 140 served calls.
    const event = toPosthogEvent(row());
    expect(event.properties.rpcCallsTotal).toBe(140);
    expect(event.properties.rpcSamples).toBe(100);
    expect(event.properties.rpcCallsTotal as number).toBeGreaterThan(event.properties.rpcSamples as number);
    expect(event.properties.rpcClientSamples).toBe(100);
    expect(event.properties.rpcRealms).toBe(2);
  });
});

describe('lag columns', () => {
  test('a realm that produced no samples is distinguishable from a responsive one', ({ expect }) => {
    // The bug this closes: every worker lag column read zero for weeks while the same rows showed
    // the workers burning seconds of CPU, and nothing in the row said whether the probe had run.
    const silent = toPosthogEvent(
      row({
        responsiveness: {
          longTaskCount: 0,
          longTaskMaxMs: 0,
          tbtMs: 0,
          lagP95Ms: 0,
          lagMaxMs: 0,
          lagByRealm: [{ kind: 'worker', name: 'worker:dedicated.js', p95Ms: 0, maxMs: 0, count: 0 }],
        },
      }),
    );
    const responsive = toPosthogEvent(
      row({
        responsiveness: {
          longTaskCount: 0,
          longTaskMaxMs: 0,
          tbtMs: 0,
          lagP95Ms: 0,
          lagMaxMs: 0,
          lagByRealm: [{ kind: 'worker', name: 'worker:dedicated.js', p95Ms: 0, maxMs: 0, count: 31 }],
        },
      }),
    );

    expect(silent.properties.lagMaxMsWorker).toBe(0);
    expect(responsive.properties.lagMaxMsWorker).toBe(0);
    expect(silent.properties.lagSamplesWorker).toBe(0);
    expect(responsive.properties.lagSamplesWorker).toBe(31);
  });
});

describe('disjoint memory categories', () => {
  test('backing is published with wasm removed, so the two can be stacked', ({ expect }) => {
    // `backingStorageSize` counts wasm linear memory AND `ArrayBuffer`s, so a chart stacking the
    // raw column beside `wasmBytes` draws every wasm byte twice. The disjoint set is
    // {heapUsedBytes, wasmBytes, heapBackingNonWasmBytes, embedderBytes}.
    const event = toPosthogEvent(
      row({
        heap: [
          {
            kind: 'page',
            name: 'page',
            usedBytes: 1_000,
            totalBytes: 2_000,
            backingBytes: 26_121_045,
            embedderBytes: 11_330_104,
            wasmBytes: 4_521_984,
            wasmInstances: 3,
          },
        ],
      }),
    );

    expect(event.properties.heapBackingBytesTab).toBe(26_121_045);
    expect(event.properties.heapBackingNonWasmBytesTab).toBe(26_121_045 - 4_521_984);
    expect(event.properties.embedderBytesTab).toBe(11_330_104);
  });

  test('a realm that grew a memory mid-read cannot draw a negative segment', ({ expect }) => {
    const event = toPosthogEvent(
      row({
        heap: [{ kind: 'page', name: 'page', usedBytes: 1, totalBytes: 2, backingBytes: 10, wasmBytes: 40 }],
      }),
    );

    expect(event.properties.heapBackingNonWasmBytesTab).toBe(0);
  });

  test('wasm is split by library, and subduction is not counted as automerge', ({ expect }) => {
    // Subduction ships as `automerge_subduction_wasm_bg.wasm`, so an automerge-first match would
    // attribute all of it to automerge — the whole reason the classifier tests subduction first.
    const event = toPosthogEvent(
      row({
        heap: [
          {
            kind: 'worker',
            name: 'worker',
            usedBytes: 1,
            totalBytes: 2,
            wasmBytes: 23_396_352,
            wasmInstances: 3,
            wasmByModule: {
              'sqlite3.wasm': 17_432_576,
              'automerge_wasm_bg.wasm': 3_080_192,
              'automerge_subduction_wasm_bg.wasm': 2_883_584,
            },
          },
        ],
      }),
    );

    expect(event.properties.wasmSqliteBytesWorker).toBe(17_432_576);
    expect(event.properties.wasmAutomergeBytesWorker).toBe(3_080_192);
    expect(event.properties.wasmSubductionBytesWorker).toBe(2_883_584);
    expect(event.properties.wasmOtherBytesWorker).toBe(0);
    // The libraries partition the realm's wasm exactly.
    const split =
      (event.properties.wasmSqliteBytesWorker as number) +
      (event.properties.wasmAutomergeBytesWorker as number) +
      (event.properties.wasmSubductionBytesWorker as number) +
      (event.properties.wasmOtherBytesWorker as number);
    expect(split).toBe(event.properties.wasmBytesWorker);
  });

  test('wasm the module map does not account for still lands in a bucket', ({ expect }) => {
    // A realm can report bytes with no map — a probe predating per-module attribution does exactly
    // that — and the libraries summing to zero against a non-zero total would make the partition
    // this file documents false.
    const event = toPosthogEvent(
      row({
        heap: [{ kind: 'worker', name: 'worker', usedBytes: 1, totalBytes: 2, wasmBytes: 9_000, wasmInstances: 1 }],
      }),
    );

    expect(event.properties.wasmOtherBytesWorker).toBe(9_000);
    expect(event.properties.wasmBytesWorker).toBe(9_000);
  });

  test('a partial module map has its remainder attributed rather than dropped', ({ expect }) => {
    const event = toPosthogEvent(
      row({
        heap: [
          {
            kind: 'worker',
            name: 'worker',
            usedBytes: 1,
            totalBytes: 2,
            wasmBytes: 10_000,
            wasmInstances: 2,
            wasmByModule: { 'automerge_wasm_bg.wasm': 4_000 },
          },
        ],
      }),
    );

    expect(event.properties.wasmAutomergeBytesWorker).toBe(4_000);
    expect(event.properties.wasmOtherBytesWorker).toBe(6_000);
  });

  test('an unrecognised module lands in Other rather than vanishing', ({ expect }) => {
    const event = toPosthogEvent(
      row({
        heap: [
          {
            kind: 'page',
            name: 'page',
            usedBytes: 1,
            totalBytes: 2,
            wasmBytes: 655_360,
            wasmInstances: 1,
            wasmByModule: { 'chunk-hypercore-crypto-CpKxpBdJ.js': 655_360 },
          },
        ],
      }),
    );

    expect(event.properties.wasmOtherBytesTab).toBe(655_360);
    expect(event.properties.wasmAutomergeBytesTab).toBe(0);
  });
});

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
  threadByRealm: [
    { kind: 'page', name: 'page', ...EMPTY_REALM_THREAD },
    { kind: 'worker', name: 'worker:dedicated.js', ...EMPTY_REALM_THREAD },
  ],
  heap: [
    {
      kind: 'page',
      name: 'page',
      usedBytes: 50_000_000,
      totalBytes: 80_000_000,
      backingBytes: 4_000_000,
      wasmBytes: 16_777_216,
      wasmInstances: 2,
    },
    {
      kind: 'shared_worker',
      name: 'shared_worker:worker.js',
      usedBytes: 120_000_000,
      totalBytes: 160_000_000,
      backingBytes: 9_000_000,
      wasmBytes: 67_108_864,
      wasmInstances: 3,
    },
  ],
  heapUsedTotalBytes: 170_000_000,
  footprint: [
    { pid: 10, process: 'Renderer', bytes: 300_000_000 },
    { pid: 11, process: 'Renderer', bytes: 120_000_000 },
    { pid: 12, process: 'GPU Process', bytes: 80_000_000 },
  ],
  appFootprintBytes: 420_000_000,
  domNodes: 24_000,
  domListeners: 3_100,
  domDocuments: 2,
  network: {
    codeBytes: 1_000,
    apiBytes: 2_000,
    otherBytes: 3,
    requests: 9,
    apiRequests: 4,
    edgeApiBytes: 1_500,
    edgeApiRequests: 3,
    edgeSocketBytes: 640_000,
    edgeSocketFrames: 210,
    analyticsBytes: 500,
  },
  disk: { readBytes: 2_400_000, writeBytes: 900_000, reads: 600, writes: 210, syncs: 18, realms: 1 },
  rpc: [
    {
      kind: 'page',
      name: 'page',
      calls: 0,
      queueWaitP95Ms: 0,
      queueWaitMaxMs: 0,
      serviceMaxMs: 0,
      clientCalls: 140,
      roundTripP95Ms: 90,
      roundTripMaxMs: 460,
      samples: 0,
      clientSamples: 100,
    },
    {
      kind: 'worker',
      name: 'worker:dedicated.js',
      calls: 140,
      queueWaitP95Ms: 55,
      queueWaitMaxMs: 380,
      serviceMaxMs: 120,
      clientCalls: 0,
      roundTripP95Ms: 0,
      roundTripMaxMs: 0,
      samples: 100,
      clientSamples: 0,
    },
  ],
  responsiveness: {
    longTaskCount: 5,
    longTaskMaxMs: 400,
    tbtMs: 700,
    lagP95Ms: 60,
    lagMaxMs: 812,
    lagByRealm: [
      { kind: 'page', name: 'page', p95Ms: 40, maxMs: 90, count: 12 },
      { kind: 'worker', name: 'worker:dedicated.js', p95Ms: 300, maxMs: 812, count: 4 },
    ],
  },
  comparability,
  ...overrides,
});
