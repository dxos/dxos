//
// Copyright 2026 DXOS.org
//

import { type Attached } from '../cdp.ts';
import { type DiskMetrics } from '../types.ts';

/**
 * Global the SQLite VFS wrapper publishes its counters under.
 *
 * Duplicated from `@dxos/sql-sqlite`'s `SQLITE_IO_GLOBAL` rather than imported: the harness reads
 * it by evaluating a string inside another realm, so the value crosses a process boundary as text
 * and a type-level import would buy nothing. Renaming it there means renaming it here, which is
 * why the expression below fails loudly (zeroes with `realms: 0`) rather than silently.
 */
const SQLITE_IO_GLOBAL = '__dxosSqliteIo';

/**
 * Reads the counters in EVERY realm and sums them.
 *
 * Per realm because SQLite runs in the dedicated worker, not the page and not the shared worker —
 * `LocalSqliteOpfsLayer` is constructed in `worker-runtime.ts` — but summing rather than splitting
 * because which worker holds the database is an implementation detail the trend should survive.
 */
const EXPRESSION = `(() => {
  const read = globalThis['${SQLITE_IO_GLOBAL}'];
  return typeof read === 'function' ? JSON.stringify(read()) : null;
})()`;

const EMPTY: DiskMetrics = {
  readBytes: 0,
  writeBytes: 0,
  reads: 0,
  writes: 0,
  syncs: 0,
  realms: 0,
};

type RemoteResult = { result?: { value?: unknown } };

/**
 * Sums SQLite's VFS counters across every attached realm.
 *
 * `realms` is the integrity column, and reading it first is the difference between "SQLite did no
 * I/O" and "nothing was instrumented": a `0` there means no realm published the counters at all,
 * so every byte below is absence rather than measurement.
 */
export const readDisk = async (targets: Attached[]): Promise<DiskMetrics> => {
  const totals: DiskMetrics = { ...EMPTY };
  for (const target of targets) {
    const response = await target.cdp.trySend<RemoteResult>('Runtime.evaluate', {
      expression: EXPRESSION,
      returnByValue: true,
    });
    const serialized = response?.result?.value;
    if (typeof serialized !== 'string') {
      continue;
    }
    // Serialized in the remote realm and parsed here: `returnByValue` on a plain object works, but
    // a string is the one shape no structured-clone edge case can mangle.
    let stats: Partial<DiskMetrics & { truncates: number }>;
    try {
      stats = JSON.parse(serialized);
    } catch {
      continue;
    }
    totals.readBytes += stats.readBytes ?? 0;
    totals.writeBytes += stats.writeBytes ?? 0;
    totals.reads += stats.reads ?? 0;
    totals.writes += stats.writes ?? 0;
    totals.syncs += stats.syncs ?? 0;
    totals.realms += 1;
  }
  return totals;
};

/**
 * Difference of two running totals — the I/O a single stage accounted for.
 *
 * `realms` is taken from the later reading rather than subtracted: it is a count of instrumented
 * realms at a point in time, not a quantity that accumulates, and a worker that started mid-stage
 * would otherwise report a negative.
 */
export const diffDisk = (before: DiskMetrics, after: DiskMetrics): DiskMetrics => ({
  readBytes: after.readBytes - before.readBytes,
  writeBytes: after.writeBytes - before.writeBytes,
  reads: after.reads - before.reads,
  writes: after.writes - before.writes,
  syncs: after.syncs - before.syncs,
  realms: after.realms,
});

export type WaitForQuietDiskOptions = {
  /** How long SQLite must go without a write before it counts as settled. */
  quietMs?: number;
  timeoutMs?: number;
  pollMs?: number;
};

/**
 * Resolves once SQLite has written nothing for `quietMs`.
 *
 * A session that ends while index passes and saves are still landing leaves them to the next load,
 * which then charges another stage for work it did not cause; ending on a quiet disk keeps a
 * "returning profile" one whose writes have all settled.
 */
export const waitForQuietDisk = async (
  targets: Attached[],
  { quietMs = 5_000, timeoutMs = 120_000, pollMs = 250 }: WaitForQuietDiskOptions = {},
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  const first = await readDisk(targets);
  // With no realm publishing counters every reading is zero, which would read as quiet at once.
  if (first.realms === 0) {
    throw new Error('No attached realm publishes SQLite counters');
  }
  let writes = first.writes;
  let quietSince = Date.now();
  while (Date.now() - quietSince < quietMs) {
    if (Date.now() > deadline) {
      throw new Error(`SQLite still writing after ${timeoutMs} ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const current = (await readDisk(targets)).writes;
    if (current !== writes) {
      writes = current;
      quietSince = Date.now();
    }
  }
};
