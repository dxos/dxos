//
// Copyright 2026 DXOS.org
//

import { closeSync, mkdirSync, openSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';

import { type Attached, type Cdp } from '../cdp.ts';
import { type HeapReading, type TargetKind } from '../types.ts';

/**
 * Allocator nodes describing pages another process owns.
 *
 * A renderer's `gpu`, `cc` and `shared_memory` nodes are regions shared with the GPU process, so
 * counting them pushes the allocator sum past a footprint that never included them. The same set
 * `composer-app/scripts/memory/ledger.mjs` excludes.
 */
const SHARED_BACKED = new Set(['cc', 'gpu', 'ioaccelerator', 'iosurface', 'shared_memory']);

/** One process's detailed dump, reduced to the allocator breakdown that explains its footprint. */
export type ProcessAllocators = {
  pid: number;
  process: string;
  footprintBytes: number;
  /** Top-level allocator nodes, less shared-backed nodes and cross-tree ownership views. */
  privateAllocatorBytes: number;
  sharedBackedBytes: number;
  /** Footprint no allocator claims. Wasm linear memory lands here: it has no dump provider. */
  unattributedBytes: number;
  /** Top-level nodes, view-deducted, largest first. */
  allocators: Record<string, number>;
  /** Every nested node's `effective_size`, largest first, for naming what a big allocator holds. */
  children: Record<string, number>;
};

type DumpNode = { guid?: string; attrs?: Record<string, { value?: string }> };

export type DumpEvent = {
  ph?: string;
  pid?: number;
  name?: string;
  args?: {
    name?: string;
    dumps?: {
      process_totals?: Record<string, string>;
      allocators?: Record<string, DumpNode>;
      allocators_graph?: { source: string; target: string; type: string }[];
    };
  };
};

type RawProcess = {
  totals?: Record<string, string>;
  allocators: Record<string, DumpNode>;
  graph: { source: string; target: string; type: string }[];
};

/** Hex without an `0x` prefix, throughout memory-infra. */
const hex = (value: string | undefined): number => (value ? parseInt(value, 16) : Number.NaN);

/**
 * Reduces a detailed memory-infra dump to one allocator breakdown per process.
 *
 * Ownership edges that cross allocator trees are views, not memory: every `blink_objects` node owns
 * a `blink_gc` node, so summing both double counts Oilpan. The view side is subtracted.
 */
export const parseDetailedDump = (events: DumpEvent[]): ProcessAllocators[] => {
  const names = new Map<number, string>();
  const byPid = new Map<number, RawProcess>();
  for (const event of events) {
    if (event.pid == null) {
      continue;
    }
    if (event.ph === 'M' && event.name === 'process_name' && event.args?.name) {
      names.set(event.pid, event.args.name);
    }
    const dumps = event.args?.dumps;
    if (event.ph !== 'v' || !dumps) {
      continue;
    }
    // One process's totals and its allocator tree can arrive in separate events.
    const raw = byPid.get(event.pid) ?? { allocators: {}, graph: [] };
    raw.totals = dumps.process_totals ?? raw.totals;
    Object.assign(raw.allocators, dumps.allocators ?? {});
    raw.graph.push(...(dumps.allocators_graph ?? []));
    byPid.set(event.pid, raw);
  }

  const result: ProcessAllocators[] = [];
  for (const [pid, raw] of byPid) {
    const footprintBytes = hex(raw.totals?.private_footprint_bytes);
    if (!Number.isFinite(footprintBytes) || footprintBytes === 0) {
      continue;
    }
    const sizes = new Map<string, number>();
    const nameByGuid = new Map<string, string>();
    for (const [name, node] of Object.entries(raw.allocators)) {
      const bytes = hex(node.attrs?.effective_size?.value ?? node.attrs?.size?.value);
      if (Number.isFinite(bytes)) {
        sizes.set(name, bytes);
      }
      if (node.guid) {
        nameByGuid.set(node.guid, name);
      }
    }

    const viewBytes = new Map<string, number>();
    for (const edge of raw.graph) {
      const source = edge.type === 'ownership' ? nameByGuid.get(edge.source) : undefined;
      const target = source ? nameByGuid.get(edge.target) : undefined;
      if (!source || !target || !sizes.get(source)) {
        continue;
      }
      const root = source.split('/')[0];
      // Within one tree `effective_size` already resolves the edge; a zero target means the graph
      // processor resolved it on that side.
      if (root !== target.split('/')[0] && (sizes.get(target) ?? 0) > 0) {
        viewBytes.set(root, (viewBytes.get(root) ?? 0) + sizes.get(source)!);
      }
    }

    const allocators: [string, number][] = [];
    const children: [string, number][] = [];
    let sharedBackedBytes = 0;
    for (const [name, bytes] of sizes) {
      if (name.includes('/')) {
        children.push([name, bytes]);
      } else if (SHARED_BACKED.has(name)) {
        sharedBackedBytes += bytes;
      } else {
        allocators.push([name, Math.max(0, bytes - (viewBytes.get(name) ?? 0))]);
      }
    }
    const privateAllocatorBytes = allocators.reduce((total, [, bytes]) => total + bytes, 0);
    const byBytes = (a: [string, number], b: [string, number]) => b[1] - a[1];
    result.push({
      pid,
      process: names.get(pid) ?? 'unknown',
      footprintBytes,
      privateAllocatorBytes,
      sharedBackedBytes,
      unattributedBytes: footprintBytes - privateAllocatorBytes,
      allocators: Object.fromEntries(allocators.sort(byBytes)),
      children: Object.fromEntries(children.sort(byBytes)),
    });
  }
  return result.sort((a, b) => b.footprintBytes - a.footprintBytes);
};

/** Resolves with `promise`, or with `undefined` after `ms`; the timer never outlives the race. */
const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const expired = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), ms);
    });
    return await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Records one detailed memory-infra dump over the browser target, or `undefined` if the dump did
 * not complete.
 *
 * `deterministic` forces a GC in every process first, so the dump describes live memory; without
 * it the dump includes garbage the next collection would free.
 */
export const recordDetailedDump = async (
  browserCdp: Cdp,
  { deterministic = true }: { deterministic?: boolean } = {},
): Promise<DumpEvent[] | undefined> => {
  const events: DumpEvent[] = [];
  const collect = (params: { value?: DumpEvent[] }) => {
    events.push(...(params?.value ?? []));
  };
  let settle: () => void = () => {};
  const complete = new Promise<true>((resolve) => {
    settle = () => resolve(true);
  });
  browserCdp.on('Tracing.dataCollected', collect);
  browserCdp.on('Tracing.tracingComplete', settle);
  try {
    const started = await browserCdp.trySend('Tracing.start', {
      traceConfig: {
        excludedCategories: ['*'],
        includedCategories: ['disabled-by-default-memory-infra', '__metadata'],
      },
      transferMode: 'ReportEvents',
    });
    if (started === undefined) {
      return undefined;
    }
    const dumped = await browserCdp.trySend('Tracing.requestMemoryDump', { deterministic, levelOfDetail: 'detailed' });
    // Ended even when the dump failed, so tracing does not stay on for the rest of the run.
    const ended = await browserCdp.trySend('Tracing.end');
    if (ended === undefined) {
      return undefined;
    }
    const completed = await withTimeout(complete, 60_000);
    return dumped !== undefined && completed ? events : undefined;
  } finally {
    browserCdp.off('Tracing.dataCollected', collect);
    browserCdp.off('Tracing.tracingComplete', settle);
  }
};

/** Upper bound on one realm's snapshot; a loaded page serializes in well under a minute. */
const HEAP_SNAPSHOT_TIMEOUT_MS = 300_000;

/**
 * Streams one realm's V8 heap snapshot to `file`.
 *
 * Written chunk by chunk: joined first, a loaded realm's snapshot passes V8's string cap.
 */
const writeHeapSnapshot = async (target: Attached, file: string): Promise<boolean> => {
  const handle = openSync(file, 'w');
  let written = 0;
  const onChunk = ({ chunk }: { chunk: string }) => {
    writeSync(handle, chunk);
    written += chunk.length;
  };
  target.cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  try {
    const request = target.cdp
      .trySend('HeapProfiler.takeHeapSnapshot', {
        captureNumericValue: false,
        reportProgress: false,
        treatGlobalObjectsAsRoots: true,
      })
      .then((result) => ({ result }));
    const taken = await withTimeout(request, HEAP_SNAPSHOT_TIMEOUT_MS);
    if (taken === undefined) {
      // CDP cannot cancel the command, so the realm keeps serializing into every later stage.
      throw new Error(`heap snapshot of ${target.name} did not finish in ${HEAP_SNAPSHOT_TIMEOUT_MS / 1000} s`);
    }
    return taken.result !== undefined && written > 0;
  } finally {
    target.cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
    closeSync(handle);
  }
};

/**
 * A file stem for a realm, unique within one directory: two dedicated workers running one bundle
 * share a name, and sanitizing can map distinct names onto one stem.
 */
export const uniqueStem = (name: string, used: Map<string, number>): string => {
  const stem = name.replace(/[^\w.-]/g, '_');
  const count = used.get(stem) ?? 0;
  used.set(stem, count + 1);
  return count > 0 ? `${stem}-${count}` : stem;
};

export type RealmSnapshot = { name: string; kind: TargetKind; file?: string; bytes?: number };

export type MemorySnapshot = {
  dir: string;
  /** Every file written, for the row's artifact list. */
  files: string[];
  processes: ProcessAllocators[];
  realms: RealmSnapshot[];
};

/**
 * A whole-browser memory snapshot: a detailed allocator dump per process and a V8 heap snapshot
 * per realm, written under `dir`.
 *
 * The dump comes first because a heap snapshot allocates hundreds of megabytes in the realm it
 * serializes, which would otherwise land in the footprint the dump reports. Neither is cheap —
 * seconds to minutes on a loaded tab — so this runs outside every measured window.
 *
 * Files: `memory-infra.json` (raw dump events), `allocators.json` (the parsed breakdown),
 * `<realm>.heapsnapshot` (loadable in DevTools' Memory panel), and `summary.json` indexing them.
 * With `preGc`, a dump recorded before anything forced a collection, also `allocators-pre-gc.json`;
 * with `preGcHeap`, the per-realm heap read at the same point, `heap-pre-gc.json`.
 */
export const takeMemorySnapshot = async ({
  browserCdp,
  targets,
  dir,
  preGc,
  preGcHeap,
}: {
  browserCdp: Cdp;
  targets: Attached[];
  dir: string;
  preGc?: DumpEvent[];
  preGcHeap?: HeapReading[];
}): Promise<MemorySnapshot> => {
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const write = (name: string, value: unknown) => {
    const file = path.join(dir, name);
    writeFileSync(file, JSON.stringify(value, null, 2));
    files.push(file);
  };

  const events = await recordDetailedDump(browserCdp);
  const processes = events ? parseDetailedDump(events) : [];
  if (events) {
    write(
      'memory-infra.json',
      events.filter((event) => event.ph === 'v' || event.name === 'process_name'),
    );
    write('allocators.json', processes);
  }
  const preGcProcesses = preGc ? parseDetailedDump(preGc) : undefined;
  if (preGcProcesses) {
    write('allocators-pre-gc.json', preGcProcesses);
  }
  if (preGcHeap) {
    write('heap-pre-gc.json', preGcHeap);
  }

  const realms: RealmSnapshot[] = [];
  const used = new Map<string, number>();
  for (const target of targets) {
    const file = path.join(dir, `${uniqueStem(target.name, used)}.heapsnapshot`);
    if (await writeHeapSnapshot(target, file)) {
      files.push(file);
      realms.push({ name: target.name, kind: target.kind, file, bytes: statSync(file).size });
    } else {
      rmSync(file, { force: true });
      realms.push({ name: target.name, kind: target.kind });
    }
  }

  // Relative, so a run directory stays readable after it is moved out of `test-results`.
  write('summary.json', {
    processes: processes.map(({ children: _, ...rest }) => rest),
    ...(preGcProcesses ? { preGcProcesses: preGcProcesses.map(({ children: _, ...rest }) => rest) } : {}),
    realms: realms.map((realm) => (realm.file ? { ...realm, file: path.basename(realm.file) } : realm)),
  });
  return { dir, files, processes, realms };
};
