//
// Copyright 2026 DXOS.org
//

import { type Attached, type Cdp } from '../cdp.ts';
import { type FootprintReading, type HeapReading } from '../types.ts';

/**
 * Repeated collection with a turn between passes.
 *
 * One `collectGarbage` leaves `FinalizationRegistry` callbacks and `WeakRef` clears pending, so a
 * reading taken straight after it still counts collected objects as live — the same three-pass
 * settle `echo-client-e2e/src/testing/retention.ts` applies on the node side.
 */
const settle = async (target: Attached): Promise<void> => {
  for (let iteration = 0; iteration < 3; iteration++) {
    await target.cdp.trySend('HeapProfiler.collectGarbage');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/**
 * Global `@dxos/util`'s wasm probe publishes its counters under.
 *
 * Duplicated from `WASM_MEMORY_GLOBAL` rather than imported, as the SQLite and RPC globals are:
 * the name crosses a process boundary as text in the expression below.
 */
const WASM_MEMORY_GLOBAL = '__dxosWasmMemory';

const WASM_EXPRESSION = `(() => {
  const read = globalThis['${WASM_MEMORY_GLOBAL}'];
  return typeof read === 'function' ? JSON.stringify(read()) : null;
})()`;

/** Wasm linear memory a realm holds, or `undefined` where the realm published no probe. */
type WasmReading = { bytes: number; sharedBytes: number; instances: number; byModule: Record<string, number> };

const readWasmMemory = async (target: Attached): Promise<WasmReading | undefined> => {
  const response = await target.cdp.trySend<{ result?: { value?: unknown } }>('Runtime.evaluate', {
    expression: WASM_EXPRESSION,
    returnByValue: true,
  });
  const serialized = response?.result?.value;
  if (typeof serialized !== 'string') {
    return undefined;
  }
  try {
    const stats: Partial<WasmReading> = JSON.parse(serialized);
    return {
      bytes: stats.bytes ?? 0,
      sharedBytes: stats.sharedBytes ?? 0,
      instances: stats.instances ?? 0,
      byModule: stats.byModule ?? {},
    };
  } catch {
    return undefined;
  }
};

/**
 * Live memory of every attached target, after a forced GC.
 *
 * Per target rather than summed at the source: the page and the shared worker move for different
 * reasons, and a single total hides which one grew.
 *
 * Wasm is read here rather than in its own pass because it belongs to the same realm and the same
 * boundary — and it is a quantity the JS-heap figures are silent about, so a reader comparing
 * `usedBytes` across a run is looking at a fraction of what the realm holds.
 */
export const readHeap = async (targets: Attached[]): Promise<HeapReading[]> => {
  const readings: HeapReading[] = [];
  for (const target of targets) {
    await settle(target);
    const usage = await target.cdp.trySend<{
      usedSize: number;
      totalSize: number;
      backingStorageSize?: number;
      embedderHeapUsedSize?: number;
    }>('Runtime.getHeapUsage');
    if (!usage) {
      continue;
    }
    const wasm = await readWasmMemory(target);
    readings.push({
      kind: target.kind,
      name: target.name,
      usedBytes: usage.usedSize,
      totalBytes: usage.totalSize,
      ...(usage.backingStorageSize != null ? { backingBytes: usage.backingStorageSize } : {}),
      ...(usage.embedderHeapUsedSize != null ? { embedderBytes: usage.embedderHeapUsedSize } : {}),
      ...(wasm
        ? {
            wasmBytes: wasm.bytes,
            wasmSharedBytes: wasm.sharedBytes,
            wasmInstances: wasm.instances,
            wasmByModule: wasm.byModule,
          }
        : {}),
    });
  }
  return readings;
};

export type DomCounters = { nodes: number; listeners: number; documents: number };

/**
 * DOM node, listener and document counts for the page.
 *
 * The cheap leak canary, and the direct signal for a list that renders every row of a large set:
 * node count rises with the data rather than with the viewport.
 */
export const readDomCounters = async (page: Attached | undefined): Promise<DomCounters> => {
  const counters = await page?.cdp.trySend<{ documents: number; nodes: number; jsEventListeners: number }>(
    'Memory.getDOMCounters',
  );
  return {
    nodes: counters?.nodes ?? 0,
    listeners: counters?.jsEventListeners ?? 0,
    documents: counters?.documents ?? 0,
  };
};

/** Trace events carrying a process's own memory dump; `ph: 'v'` is the memory-infra dump phase. */
type DumpEvent = {
  ph?: string;
  pid?: number;
  name?: string;
  args?: { name?: string; dumps?: { process_totals?: { private_footprint_bytes?: string } } };
};

/**
 * Private footprint of every browser process, named.
 *
 * Replaces a sum of `ps` RSS over the process tree, which was not a quantity: every process's RSS
 * counts the shared pages it maps, so the total multi-counts — an empty headless Chromium sums to
 * 1,335 MB that way against 408 MB of actual footprint. Private footprint is per-process and
 * disjoint by construction, which is what makes summing the renderers below legitimate.
 *
 * A `light` dump rather than `detailed`: it carries `process_totals` and nothing else, which is
 * the whole of what this reads, and it costs 19-24 ms against 122 ms.
 *
 * The trace is started and ended around the single dump because memory-infra delivers through the
 * tracing stream and there is no other way to ask. Measured at 93-131 ms for the round trip, which
 * is why this is a boundary read rather than a sampler.
 */
export const readProcessFootprint = async (browserCdp: Cdp): Promise<FootprintReading[]> => {
  const events: DumpEvent[] = [];
  const collect = (params: { value?: DumpEvent[] }) => {
    for (const event of params?.value ?? []) {
      events.push(event);
    }
  };
  let settle: () => void = () => {};
  const complete = new Promise<void>((resolve) => {
    settle = resolve;
  });
  browserCdp.on('Tracing.dataCollected', collect);
  browserCdp.on('Tracing.tracingComplete', settle);
  try {
    // `ReportEvents` rather than a stream: one light dump is ~363 events, far below the size that
    // made the CPU trace need spooling.
    const started = await browserCdp.trySend('Tracing.start', {
      traceConfig: {
        excludedCategories: ['*'],
        includedCategories: ['disabled-by-default-memory-infra', '__metadata'],
      },
      transferMode: 'ReportEvents',
    });
    if (started === undefined) {
      // Another trace is already recording, which CDP allows only one of. The caller reads this
      // stage's footprint once that trace ends; see the `boot` backfill in the flow.
      return [];
    }
    // Each step checked rather than assumed: `trySend` turns every CDP failure into `undefined`,
    // so a dump that never happened would otherwise fall through to the parse below and return an
    // empty reading — which sums to a footprint of zero and enters the trend as a measurement.
    const dumped = await browserCdp.trySend('Tracing.requestMemoryDump', {
      deterministic: false,
      levelOfDetail: 'light',
    });
    const ended = await browserCdp.trySend('Tracing.end');
    const completed = await Promise.race([
      complete.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]);
    if (dumped === undefined || ended === undefined || !completed) {
      // Nothing usable. Empty rather than partial, so the caller's `footprintProcesses` reads zero
      // and the row is legible as uncollected instead of as an app that holds no memory.
      return [];
    }
  } finally {
    browserCdp.off('Tracing.dataCollected', collect);
    browserCdp.off('Tracing.tracingComplete', settle);
  }

  // `process_name` is metadata scattered through the trace, so the names are resolved in a second
  // pass rather than as the dumps arrive.
  const names = new Map<number, string>();
  for (const event of events) {
    if (event.ph === 'M' && event.name === 'process_name' && event.pid != null && event.args?.name) {
      names.set(event.pid, event.args.name);
    }
  }
  const readings: FootprintReading[] = [];
  for (const event of events) {
    const raw = event.args?.dumps?.process_totals?.private_footprint_bytes;
    if (event.ph !== 'v' || !raw || event.pid == null) {
      continue;
    }
    // Hex without an `0x` prefix, throughout memory-infra.
    readings.push({ pid: event.pid, process: names.get(event.pid) ?? 'unknown', bytes: parseInt(raw, 16) });
  }
  return readings.sort((a, b) => b.bytes - a.bytes);
};

/**
 * Footprint of the renderers, which in this harness is the app.
 *
 * Renderers only, by process name: the browser, GPU and service processes are Chrome's own cost
 * and moved 218 MB of noise into the number this replaces. `Extension Renderer` and
 * `WebUI Top Renderer` carry their own names and are excluded with them.
 */
export const sumAppFootprint = (readings: FootprintReading[]): number =>
  readings.reduce((total, reading) => total + (reading.process === 'Renderer' ? reading.bytes : 0), 0);

/**
 * Live JS heap summed across every realm.
 *
 * A convenience total for the trend, NOT a substitute for the per-realm readings: the breakdown is
 * what says which realm grew, and the sum alone hides it.
 */
export const sumHeapUsed = (readings: HeapReading[]): number =>
  readings.reduce((total, reading) => total + reading.usedBytes, 0);
