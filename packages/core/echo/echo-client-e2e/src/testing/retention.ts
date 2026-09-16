//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';

/**
 * Shared harness for retention suites: does a subsystem release its objects once the caller lets go?
 *
 * Retention is asserted with `WeakRef` liveness rather than a byte threshold — an integer count of
 * surviving objects is machine-independent, where a heap delta needs a tolerance band that a loaded
 * CI host defeats. Heap is measured at every checkpoint and printed regardless, since the absolute
 * footprint is what the memory-usage project is targeting, and `db.stats()` residency is printed
 * beside it so a delta can be attributed to a specific cache rather than guessed at.
 *
 * Requires `--expose-gc`; suites carry the `memory` tag, which is gated on the same `DX_DEBUG_LEAKS`
 * that supplies it.
 *
 * TASKS: `.agents/projects/memory-usage/TASKS.md` (Phase 2, Linear DX-1148).
 */

export type Checkpoint = {
  label: string;
  heapUsed: number;
  external: number;
  rss: number;
  /** WASM linear memory across every instance, or undefined when the probe is not installed. */
  wasm?: number;
  /** Objects from the original query still reachable, once refs are being tracked. */
  alive?: number;
  /** Residency reported by the database itself, for attributing the heap to a cache. */
  stats?: Database.DatabaseStats;
};

export type ReportScale = {
  objectCount: number;
  payloadBytes: number;
};

/**
 * Repeated collection with a macrotask turn between passes: a single `gc()` leaves
 * `FinalizationRegistry` callbacks and `WeakRef` clears pending, so a reading taken straight after
 * it still counts collected objects as live.
 */
export const settle = async (): Promise<void> => {
  for (let iteration = 0; iteration < 3; iteration++) {
    global.gc?.();
    await new Promise((resolve) => setImmediate(resolve));
  }
};

export const aliveCount = (refs: WeakRef<object>[]): number => refs.filter((ref) => ref.deref() !== undefined).length;

/**
 * WASM linear memory, from the probe `tools/vitest/leak-setup.ts` installs under `DX_DEBUG_LEAKS`.
 * Automerge documents live here, outside `heapUsed`, and this memory is never returned to the OS —
 * so for an automerge-backed suite it is the column that moves. Undefined when unprobed rather than
 * zero, so an absent measurement cannot be mistaken for "no WASM memory".
 */
const readProbe = (name: string): number | undefined => {
  const probe = (globalThis as Record<string, unknown>)[name];
  return typeof probe === 'function' ? (probe as () => number)() : undefined;
};

const wasmBytes = (): number | undefined => readProbe('__DXOS_WASM_BYTES__');

/**
 * Settle, then read heap and (where tracked) liveness and database residency. All are sampled in
 * one pass so the printed table and the assertions describe a single moment.
 *
 * `db` is optional because the last checkpoint of a control run is taken after the database has
 * been closed, when there is nothing left to ask.
 */
export const capture = async (
  label: string,
  checkpoints: Checkpoint[],
  db?: EchoDatabase,
  refs?: WeakRef<object>[],
): Promise<Checkpoint> => {
  await settle();
  const { heapUsed, external, rss } = process.memoryUsage();
  const wasm = wasmBytes();
  // Read after the memory sample: `stats()` walks the space on the host, so anything it allocates
  // belongs to the next checkpoint's settle rather than to this reading.
  const stats = await db?.stats();
  const checkpoint = {
    label,
    heapUsed,
    external,
    rss,
    ...(wasm === undefined ? {} : { wasm }),
    ...(stats ? { stats } : {}),
    ...(refs ? { alive: aliveCount(refs) } : {}),
  };
  checkpoints.push(checkpoint);
  return checkpoint;
};

export const MB = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

const column = (value: number | string, width: number): string => String(value).padStart(width);

export const report = (title: string, checkpoints: Checkpoint[], { objectCount, payloadBytes }: ReportScale): void => {
  const floor = checkpoints[0].heapUsed;
  const instances = readProbe('__DXOS_WASM_INSTANCES__');
  console.log(
    `\n[${title}] ${objectCount} objects x ${MB(payloadBytes)} = ${MB(objectCount * payloadBytes)}` +
      (instances === undefined ? '' : ` | wasm across ${instances} instance(s)`),
  );
  console.log(
    `  ${'checkpoint'.padEnd(32)}${column('heap', 9)}${column('delta', 9)}${column('wasm', 9)}` +
      `${column('rss', 9)}${column('alive', 7)}${column('objs', 6)}${column('feeds', 6)}` +
      `${column('feedObjs', 9)}${column('docs.c', 8)}${column('docs.h', 8)}${column('queries', 8)}`,
  );
  for (const { label, heapUsed, rss, wasm, alive: live, stats } of checkpoints) {
    const delta = heapUsed - floor;
    const client = stats?.loaded.client;
    const host = stats?.loaded.host;
    console.log(
      `  ${label.padEnd(32)}${column(MB(heapUsed), 9)}${column((delta >= 0 ? '+' : '') + MB(delta), 9)}` +
        `${column(wasm === undefined ? '-' : MB(wasm), 9)}${column(MB(rss), 9)}` +
        `${column(live ?? '-', 7)}${column(client?.objects ?? '-', 6)}` +
        `${column(client?.feeds ?? '-', 6)}${column(client?.feedObjects ?? '-', 9)}` +
        `${column(client?.documents ?? '-', 8)}${column(host?.documents ?? '-', 8)}` +
        `${column(host?.queriesTotal ?? '-', 8)}`,
    );
  }
};

/** Unique per index so nothing can be deduplicated into a single shared string. */
export const makePayload = (index: number, payloadBytes: number): string => `${index}:${'x'.repeat(payloadBytes)}`;
